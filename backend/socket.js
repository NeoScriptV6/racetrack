console.log("NODE_ENV:", process.env.NODE_ENV);

const socketIO = require("socket.io");
const DBHelpers = require('./DBHelpers.js')
const db = require("./db"); 
const { handleLapRecord } = require('./lapTracker.js');

function emitLeaderboard(io, raceState, db) {
    if (!raceState.currentRace || !raceState.currentRace.cars) {
        io.emit("leaderboard-data", []);
        return;
    }
    db.all(
        `SELECT rd.car_number, d.name AS driver
         FROM race_drivers rd
         JOIN drivers d ON rd.driver_id = d.id
         WHERE rd.race_id = (SELECT id FROM race WHERE active = 1 LIMIT 1)`,
        [],
        (err, rows) => {
            const driverMap = {};
            if (rows) {
                rows.forEach(row => {
                    driverMap[row.car_number] = row.driver;
                });
            }
            const leaderboardData = Object.entries(raceState.currentRace.cars).map(([carNumber, carData]) => ({
                carNumber: Number(carNumber),
                driver: driverMap[carNumber] || "—",
                laps: carData.lapCount || 0,
                lastLap: carData.lastLapDuration || 0,
                fastestLap: carData.fastestLap || 0,
            }));
            leaderboardData.sort((a, b) => b.laps - a.laps || a.lastLap - b.lastLap);
            io.emit("leaderboard-data", leaderboardData);
        }
    );
}

module.exports = (server) => {

    const io = socketIO(server, {
        cors: {
            origin: "*", // Allow all origins for dev/testing
            methods: ["GET", "POST"],
        },
    });

    const raceState = {
        currentRace: {
            cars: {},
            status: 'not started',
        },
    };

    let raceTimer = null;
    let remainingTime = 0;

    io.on("connection", (socket) => {
        console.log("New client connected");

        socket.on("auth", ({ role, code }, callback) => {
            let valid = false;
            if (role === "receptionist" && code === process.env.RECEPTIONIST_KEY) valid = true;
            if (role === "observer" && code === process.env.OBSERVER_KEY) valid = true;
            if (role === "safety" && code === process.env.SAFETY_KEY) valid = true;

            setTimeout(() => {
                callback({ success: valid });
            }, 500); // 500ms delay for security
        });


        socket.on("get_flag", (raceId) => {
            DBHelpers.GetFromDB("flag", raceId, (err, result) => {
                if (err) {
                    console.error("Error:", err);
                } else {
                    io.emit("flag_updated", { flag: result }); 
                }
            });
        });

        //send all races and drivers associated with it (this is for the front desk)
        DBHelpers.GetFromDB("races", 0, (err, result) => {
            if (err) {
                console.error("Error:", err);
            } else {
                io.emit("load_races", { rows: result});
            }
        });

        socket.on("update_flag", (data) => {
            console.log("Flag updated to:", data.flag);


            DBHelpers.UpdateDB("flag", data.race_id, data);

        
            io.emit("flag_updated", { flag: data.flag });

    
            emitLeaderboard(io, raceState, db);
        });

        socket.on("add_race", (data) => {
            
            db.run(
                `INSERT INTO race (name, flag, start_date_time) VALUES (?, ?, ?)`,
                [data.raceName, "Danger", data.raceDateTime],
                function (err) {
                    if (err) {
                        console.error("Error inserting race:", err.message);
                        return;
                    }
                    const currentRaceId = this.lastID;
                    console.log("Race inserted with ID:", currentRaceId);

                
                    const driverPromises = data.drivers.map((driver) => {
                        return new Promise((resolve, reject) => {
                            db.run(`INSERT INTO drivers (name) VALUES (?)`, [driver.name], function (err) {
                                if (err) {
                                    console.error("Error inserting driver:", err.message);
                                    reject(err);
                                    return;
                                }
                                const currentDriverId = this.lastID; 
                                console.log(`Driver "${driver.name}" inserted with ID: ${currentDriverId}`);
                                db.run(
                                    `INSERT INTO race_drivers (race_id, driver_id, car_number) VALUES (?, ?, ?)`,
                                    [currentRaceId, currentDriverId, driver.carNumber], // Using car number from frontend
                                    function (err) {
                                        if (err) {
                                            console.error("Error linking driver to race:", err.message);
                                            reject(err);
                                        } else {
                                            console.log(
                                                `Driver "${driver.name}" linked to race with car number: ${driver.carNumber}`
                                            );
                                            resolve();
                                        }
                                    }
                                );
                            });
                        });
                    });

            
                    Promise.all(driverPromises)
                        .then(() => {
                     
                            db.all(
                                `SELECT r.id AS race_id, r.name AS race_name, r.start_date_time AS race_start_time, 
                                        d.name AS driver_name, rd.car_number AS car_number
                                 FROM race r
                                 LEFT JOIN race_drivers rd ON r.id = rd.race_id
                                 LEFT JOIN drivers d ON rd.driver_id = d.id`,
                                [],
                                (err, rows) => {
                                    if (err) {
                                        console.error("Error retrieving updated races:", err.message);
                                    } else {
                                        // Grouping drivers by race
                                        const races = rows.reduce((acc, row) => {
                                            const race = acc.find((r) => r.race_id === row.race_id);
                                            if (race) {
                                                race.drivers.push({ name: row.driver_name, car_number: row.car_number });
                                            } else {
                                                acc.push({
                                                    safe_to_start: row.safe_to_start,
                                                    race_id: row.race_id,
                                                    race_name: row.race_name,
                                                    race_start_time: row.race_start_time,
                                                    drivers: row.driver_name
                                                        ? [{ name: row.driver_name, car_number: row.car_number }]
                                                        : [],
                                                });
                                            }
                                            return acc;
                                        }, []);
                                        io.emit("load_races", { rows: races });
                                        emitLeaderboard(io, raceState, db);
                                    }
                                }
                            );
                        })
                        .catch((err) => {
                            console.error("Error inserting drivers or linking them to the race:", err.message);
                        });
                }
            );
        });

        socket.on("delete_race", (raceId) => {
            console.log(`Deleting race with ID: ${raceId}`);
        

            db.run(`DELETE FROM race_drivers WHERE race_id = ?`, [raceId], (err) => {
                if (err) {
                    console.error("Error deleting race drivers:", err.message);
                    return;
                }
                console.log("Deleted drivers associated with the race.");
        
                // Deleting the race itself..
                db.run(`DELETE FROM race WHERE id = ?`, [raceId], (err) => {
                    if (err) {
                        console.error("Error deleting race:", err.message);
                        return;
                    }
                    console.log("Deleted race successfully.");
                    io.emit("timer-update", { remainingTime: 0 });
                    DBHelpers.GetFromDB("races", 0, (err, result) => {
                        if (err) {
                            console.error("Error retrieving updated races:", err.message);
                        } else {
                            io.emit("load_races", { rows: result });
                            emitLeaderboard(io, raceState, db); 
                        }
                    });
                });
            });
        });

        socket.on("add_driver", (data) => {
            const { raceId, driverName, carNumber } = data;
        
            db.run(`INSERT INTO drivers (name) VALUES (?)`, [driverName], function (err) {
                if (err) {
                    console.error("Error inserting driver:", err.message);
                    return;
                }
                const driverId = this.lastID; 
        
                db.run(
                    `INSERT INTO race_drivers (race_id, driver_id, car_number) VALUES (?, ?, ?)`,
                    [raceId, driverId, carNumber],
                    (err) => {
                        if (err) {
                            console.error("Error linking driver to race:", err.message);
                            return;
                        }
                        console.log(`Driver "${driverName}" added to race ${raceId} with car number ${carNumber}`);
        
                        DBHelpers.GetFromDB("races", 0, (err, result) => {
                            if (err) {
                                console.error("Error retrieving updated races:", err.message);
                            } else {
                                io.emit("load_races", { rows: result });
                                emitLeaderboard(io, raceState, db); 
                            }
                        });
                    }
                );
            });
        });

        socket.on("remove_driver", (data) => {
            const { driverId } = data;
        

            db.run(`DELETE FROM race_drivers WHERE driver_id = ?`, [driverId], (err) => {
                if (err) {
                    console.error("Error removing driver from race:", err.message);
                    return;
                }
        

                db.run(`DELETE FROM drivers WHERE id = ?`, [driverId], (err) => {
                    if (err) {
                        console.error("Error deleting driver:", err.message);
                        return;
                    }
                    console.log(`Driver ${driverId} removed from the race`);
        

                    DBHelpers.GetFromDB("races", 0, (err, result) => {
                        if (err) {
                            console.error("Error retrieving updated races:", err.message);
                        } else {
                            io.emit("load_races", { rows: result });
                            emitLeaderboard(io, raceState, db); 
                        }
                    });
                });
            });
        });

 
        socket.on("request-leaderboard", () => {
            if (!raceState.currentRace || !raceState.currentRace.cars) {
                socket.emit("leaderboard-data", []);
                return;
            }


            db.all(
                `SELECT rd.car_number, d.name AS driver
                 FROM race_drivers rd
                 JOIN drivers d ON rd.driver_id = d.id
                 WHERE rd.race_id = (SELECT id FROM race WHERE active = 1 LIMIT 1)`,
                [],
                (err, rows) => {
                    const driverMap = {};
                    if (rows) {
                        rows.forEach(row => {
                            driverMap[row.car_number] = row.driver;
                        });
                    }
                    // Builds a leaderboard from in-memory lap data for yOFT
                    const leaderboardData = Object.entries(raceState.currentRace.cars).map(([carNumber, carData]) => ({
                        carNumber: Number(carNumber),
                        driver: driverMap[carNumber] || "—",
                        laps: carData.lapCount || 0,
                        lastLap: carData.lastLapDuration || 0,
                        fastestLap: carData.fastestLap || 0,
                    }));

                    leaderboardData.sort((a, b) => b.laps - a.laps || a.lastLapTime - b.lastLapTime);
                    socket.emit("leaderboard-data", leaderboardData);
                }
            );
        });


      

        socket.on("start-race", (data) => {
            const race_id = data.race_id;
            if (raceTimer) {
                clearInterval(raceTimer); 
            }

            // Set the race duration (10 minutes in production, 1 minute in dev mode)
            remainingTime = process.env.NODE_ENV === "development" ? 60 : 600;
            db.run(
                `UPDATE race SET time_remaining = ? WHERE id = ?`,
                [remainingTime, race_id],
                (err) => {
                    if (err) {
                        console.error("Error updating timeRemaining at start:", err.message);
                    }
                }
            );


            db.run(
                `UPDATE race SET active = 1 WHERE id = ?`,
                [race_id],
                (err) => {
                    if (err) {
                        console.error("Error setting race active", err.message);
                    }
                }
            );


            io.emit("timer-update", { remainingTime });

            
            raceState.currentRace = {
                cars: {},
                status: 'running'
            };
            db.all(
                `SELECT car_number FROM race_drivers WHERE race_id = ?`,
                [race_id],
                (err, rows) => {
                    if (rows) {
                        const raceStartTimestamp = Date.now();
                        rows.forEach(row => {
                            raceState.currentRace.cars[row.car_number] = {
                                lapCount: 0,
                                fastestLap: 0,
                                lastLapDuration: 0,
                                raceStartTimestamp,
                            };
                        });
                    }
                    io.emit('race-data', {
                        cars: raceState.currentRace.cars,
                        status: raceState.currentRace.status,
                    });
                    emitLeaderboard(io, raceState, db); 
                }
            );


            io.emit('race-data', {
                cars: raceState.currentRace.cars,
                status: raceState.currentRace.status,
            });


            raceTimer = setInterval(() => {
                remainingTime -= 1;


                db.run(
                    `UPDATE race SET time_remaining = ? WHERE id = ?`,
                    [remainingTime, race_id],
                    (err) => {
                        if (err) {
                            console.error("Error updating timeRemaining:", err.message);
                        }
                    }
                );

                if (remainingTime <= 0) {
                        console.log("wtf")

                    clearInterval(raceTimer);
                    raceTimer = null;
                    io.emit("timer-update", { remainingTime: 0 }); 
                    io.emit("race-finished"); 
                    io.emit("timer-ran-out");
                    db.run(
                        `UPDATE race SET time_remaining = 0 WHERE id = ?`,
                        [race_id],
                        (err) => {
                            if (err) {
                                console.error("Error updating timeRemaining at finish:", err.message);
                            }
                        }
                    );
                } else {
                    io.emit("timer-update", { remainingTime }); 
                }
            }, 1000);
        });

 
        socket.on("stop-race", (data) => {
            const race_id = data.race_id;
            if (raceTimer) {
                clearInterval(raceTimer);
                raceTimer = null;
            }
            db.run(`UPDATE race SET active = 0, stopped = 1, flag = 'Danger' WHERE id = ?`, [race_id], (err) => {
                if (err) {
                    console.error("Error stopping race");
                    return;
                }
                DBHelpers.GetFromDB("races", 0, (err, result) => {
                    if (!err) {
                        io.emit("load_races", { rows: result });
                    }
                });
      
                io.emit("flag_updated", { flag: "Danger" });
                io.emit("timer-update", { remainingTime: 0 });
            });
           
            raceState.currentRace.status = 'not started';
            io.emit("race-stopped");
            io.emit("race-data", {
                cars: raceState.currentRace.cars,
                status: raceState.currentRace.status,
            });
            emitLeaderboard(io, raceState, db); 
        });

        socket.on("set-safe-to-start", (data) => {
            const { safe, raceId } = data;

            if (safe && raceId) {
                db.run(
                    `UPDATE race SET safe_to_start = ? WHERE id = ?`,
                    [1, raceId],
                    (err) => {
                        if (err) {
                            console.error("Error updating race status:", err.message);
                            return;
                        }
                        DBHelpers.GetFromDB("races", 0, (err, result) => {
                            if (!err) {
                                io.emit("load_races", { rows: result });
                            }
                        });
                    }
                );
                io.emit("race-set-to-safe", raceId);
            } else {
                console.error("Invalid data received for set-safe-to-start:", data);
            }
        });

        handleLapRecord(socket, raceState);

        socket.on("update_race", (data) => {
            const { raceId, drivers } = data;

            db.run(`DELETE FROM race_drivers WHERE race_id = ?`, [raceId], (err) => {
                if (err) {
                    console.error("Error deleting existing drivers:", err.message);
                    return;
                }

                console.log(`Deleted existing drivers for race ID: ${raceId}`);

                const driverPromises = drivers.map((driver) => {
                    return new Promise((resolve, reject) => {
                        db.get(`SELECT id FROM drivers WHERE name = ?`, [driver.name], (err, row) => {
                            if (err) {
                                console.error("Error checking driver existence:", err.message);
                                reject(err);
                                return;
                            }

                            if (row) {
                                const driverId = row.id;
                                insertDriverIntoRace(raceId, driverId, driver.car_number, resolve, reject);
                            } else {
                                db.run(`INSERT INTO drivers (name) VALUES (?)`, [driver.name], function (err) {
                                    if (err) {
                                        console.error("Error inserting driver:", err.message);
                                        reject(err);
                                        return;
                                    }
                                    const driverId = this.lastID;
                                    console.log(`Inserted new driver "${driver.name}" with ID: ${driverId}`);
                                    insertDriverIntoRace(raceId, driverId, driver.car_number, resolve, reject);
                                });
                            }
                        });
                    });
                });


                function insertDriverIntoRace(raceId, driverId, carNumber, resolve, reject) {
                    db.run(
                        `INSERT INTO race_drivers (race_id, driver_id, car_number) VALUES (?, ?, ?)`,
                        [raceId, driverId, carNumber],
                        (err) => {
                            if (err) {
                                console.error("Error inserting driver into race_drivers:", err.message);
                                reject(err);
                            } else {
                                console.log(`Driver with ID ${driverId} added to race ${raceId} with car number ${carNumber}`);
                                resolve();
                            }
                        }
                    );
                }

                Promise.all(driverPromises)
                    .then(() => {
                        DBHelpers.GetFromDB("races", 0, (err, result) => {
                            if (err) {
                                console.error("Error retrieving updated races:", err.message);
                            } else {
                                io.emit("load_races", { rows: result });
                                emitLeaderboard(io, raceState, db); 
                            }
                        });
                    })
                    .catch((err) => {
                        console.error("Error updating drivers for race:", err.message);
                    });
            });
        });

        socket.on('request-race-data', () => {
            if (raceState.currentRace && raceState.currentRace.status === 'running') {
                socket.emit('race-data', {
                    cars: raceState.currentRace.cars,
                    status: raceState.currentRace.status,
                });
            } else {
                socket.emit('race-data', { cars: {}, status: 'not started' });
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected");
        });
    });


    db.get(`SELECT * FROM race WHERE active = 1 LIMIT 1`, [], (err, row) => {
        if (row) {
            raceState.currentRace = {
                cars: {}, 
                status: 'running'
            };
            for (let carNum = 1; carNum <= 8; carNum++) {
                raceState.currentRace.cars[carNum] = {
                    lapCount: 0,
                    fastestLap: 0,
                    lastLapTime: null,
                };
            }
            remainingTime = row.time_remaining;
            if (remainingTime > 0) {
                io.emit("timer-update", { remainingTime });

                raceTimer = setInterval(() => {
                    remainingTime -= 1;

                    db.run(
                        `UPDATE race SET time_remaining = ? WHERE id = ?`,
                        [remainingTime, row.id],
                        (err) => {
                            if (err) {
                                console.error("Error updating timeRemaining:", err.message);
                            }
                        }
                    );

                    if (remainingTime <= 0) {
                        console.log("wtf")
                        raceTimer = null;
                        io.emit("timer-update", { remainingTime: 0 });
                        io.emit("race-finished");
                        io.emit("timer-ran-out");
                        io.emit("flag_updated", { flag: "Danger" }); 
                        db.run(
                            `UPDATE race SET time_remaining = 0 WHERE id = ?`,
                            [row.id],
                            (err) => {
                                if (err) {
                                    console.error("Error updating race at finish:", err.message);
                                }
                            }
                        );
                        clearInterval(raceTimer);
                    } else {
                        io.emit("timer-update", { remainingTime });
                    }
                }, 1000);
            }
        } else {
            raceState.currentRace = { cars: {}, status: 'not started' };
        }
    });
};