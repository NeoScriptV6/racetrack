// This contains helper functions to manipoulate with the db


const db = require("./db");

function UpdateDB(toUpdate, raceId, data){
    if (toUpdate == "flag") {
        // Check if the record exists
        db.get(`SELECT * FROM race WHERE ID = (?)`, [raceId], (err, row) => {
            if (err) {
                console.error("Error checking for existing record:", err.message);
            } else if (!row) {
                // If no record exists, something must be done???????

            }

            // Updates the flag regardless of whether it was inserted or already existed
            db.run(
                `UPDATE race SET flag = (?) WHERE ID = (?)`,
                [data.flag, raceId],
                (err) => {
                    if (err) {
                        console.error("Error saving flag to database:", err.message);
                    } else {
                        console.log(`Flag saved to database. ${data.flag}`);
                    }
                }
            );
        });
    }
}

function GetFromDB(toGet, raceId, callback) { // This raceid doesnt work, you wont get races by id
    if (toGet == "flag") {
        db.get(
            `SELECT * FROM race WHERE ID = (?)`, [raceId],
            (err, row) => {
                if (err) {
                    console.error("Error retrieving flag from database:", err.message);
                    callback(err, null);
                } else if (!row) {
                    console.log("No flag found for the given raceId.");
                    callback(null, "Finish"); 
                } else {
                    console.log("Flag retrieved from database.");
                    callback(null, row.flag); 
                }
            }
        );
    } else if (toGet == "races") {
        // fetching all races and the drivers associated with them
        db.all(
            `SELECT 
                race.id AS race_id,
                race.name AS race_name,
                race.flag AS race_flag,
                race.start_date_time AS race_start_time,
                race.safe_to_start AS safe_to_start, -- Include safe_to_start
                drivers.name AS driver_name,
                race_drivers.car_number AS car_number,
                race.active AS active,
                race.stopped AS stopped,
                race.time_remaining as time_remaining
             FROM race
             LEFT JOIN race_drivers ON race.id = race_drivers.race_id
             LEFT JOIN drivers ON race_drivers.driver_id = drivers.id`,
            (err, rows) => {
                if (err) {
                    console.error("Error retrieving races and drivers:", err.message);
                    callback(err, null);
                } else {
                    
                    const races = rows.reduce((acc, row) => {
                        let race = acc.find((r) => r.race_id === row.race_id);
                        if (!race) {
                            race = {
                                remainingTime: row.time_remaining,
                                active : row.active,
                                stopped : row.stopped,
                                race_id: row.race_id,
                                race_name: row.race_name,
                                race_start_time: row.race_start_time,
                                safe_to_start: row.safe_to_start, 
                                drivers: [],
                            };
                            acc.push(race);
                        }
                        if (row.driver_name) {
                            race.drivers.push({
                                name: row.driver_name,
                                car_number: row.car_number,
                            });
                        }
                        return acc;
                    }, []);
                    callback(null, races);
                }
            }
        );     
    }
}

//not using this function yet????
function getColorForFlag(flag) {
    const flagColors = {
        Safe: "green",
        Hazard: "yellowgreen",
        Danger: "red",
        Finish: "white",
    };
    return flagColors[flag] || "white"; 
}

 module.exports = {
    UpdateDB,
    GetFromDB,
    getColorForFlag
};