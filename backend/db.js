const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Start: Create or open the SQLite database
const dbPath = path.resolve(__dirname, "racetrack.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});


// Making sure the tables are created
db.serialize(() => {


    db.run(`
        CREATE TABLE IF NOT EXISTS race (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            flag TEXT NOT NULL,
            start_date_time TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 0,
            safe_to_start INTEGER NOT NULL DEFAULT 0,
            time_remaining INTEGER NOT NULL DEFAULT 0,
            stopped INTEGER NOT NULL DEFAULT 0
        )
    `, (err) => {
        if (err) {
            console.error("Error creating race table:", err.message);
        } else {
            console.log("RACE table is ready.");
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS drivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error("Error creating drivers table:", err.message);
        } else {
            console.log("DRIVERS table is ready.");
        }
    });

    // This table is used to link drivers to races allowing a driver to participate multiple races with different car numbers
    db.run(`
        CREATE TABLE IF NOT EXISTS race_drivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            race_id INTEGER NOT NULL,
            driver_id INTEGER NOT NULL,
            car_number INTEGER NOT NULL,
            FOREIGN KEY (race_id) REFERENCES race (id),
            FOREIGN KEY (driver_id) REFERENCES drivers (id)
        )
    `, (err) => {
        if (err) {
            console.error("Error creating race_drivers table:", err.message);
        } else {
            console.log("RACE_DRIVERS table is ready.");
        }
    });
});

module.exports = db;