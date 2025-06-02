const handleLapRecord = (socket, raceState) => {
    socket.on('request-race-data', () => {
        if (raceState.currentRace) {
            socket.emit('race-data', {
                cars: raceState.currentRace.cars,
                status: raceState.currentRace.status,
            });
        } else {
            socket.emit('race-data', { cars: {}, status: 'not started' });
        }
    });

    socket.on('record-lap', (carNumber) => {
        if (
            !raceState.currentRace ||
            raceState.currentRace.status !== 'running' ||
            !raceState.currentRace.cars[carNumber] // <--- THIS LINE IS CRUCIALb (why?)
        ) {
            return;
        }

        const currentTime = Date.now();
        const car = raceState.currentRace.cars[carNumber] || {};

       if (!car.lastLapTimestamp) {
            const firstLapDuration = currentTime - (car.raceStartTimestamp || currentTime);
            car.lastLapTimestamp = currentTime;
            car.lapCount = 1;
            car.lastLapDuration = firstLapDuration;
            car.fastestLap = firstLapDuration;
        } else {
            const lapDuration = currentTime - car.lastLapTimestamp;
            if (!car.fastestLap || lapDuration < car.fastestLap) {
                car.fastestLap = lapDuration;
            }
            car.lastLapTimestamp = currentTime;
            car.lapCount = (car.lapCount || 0) + 1;
            car.lastLapDuration = lapDuration;
        }

        socket.broadcast.emit('lap-updated', {
            carNumber,
            lapCount: raceState.currentRace.cars[carNumber].lapCount,
            fastestLap: raceState.currentRace.cars[carNumber].fastestLap,
            lastLapDuration: raceState.currentRace.cars[carNumber].lastLapDuration,
        });
        socket.emit('lap-updated', {
            carNumber,
            lapCount: raceState.currentRace.cars[carNumber].lapCount,
            fastestLap: raceState.currentRace.cars[carNumber].fastestLap,
            lastLapDuration: raceState.currentRace.cars[carNumber].lastLapDuration,
        });

        if (raceState.currentRace && raceState.currentRace.cars) {
            const db = require('./db'); // adjust path if needed, ok
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
                    socket.broadcast.emit("leaderboard-data", leaderboardData);
                    socket.emit("leaderboard-data", leaderboardData);
                }
            );
        }
    });
};

module.exports = { handleLapRecord };