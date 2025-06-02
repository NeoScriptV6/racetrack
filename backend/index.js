require('dotenv').config();
const requiredKeys = ["RECEPTIONIST_KEY", "OBSERVER_KEY", "SAFETY_KEY"];
const missingKeys = requiredKeys.filter((key) => !process.env[key]);
if (missingKeys.length > 0) {
    console.error(
        "ERROR: Missing required environment variables for access keys:",
        missingKeys.join(", ")
    );
    process.exit(1);
}

const express = require("express");
const http = require("http");
const cors = require("cors"); 
const socketSetup = require("./socket"); 

const app = express();
const server = http.createServer(app); // creates an HTTP server with Express



app.use(cors());

// Uinge your socket setup with the server
socketSetup(server);

app.get("/", (req, res) => {
    res.send("Hello from Beachside Racetrack!");
});

server.listen(3000, () => {
    console.log("Server running on http://0.0.0.0:3000");
});