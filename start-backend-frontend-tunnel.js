const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// this is just for future, right now it ownly works on windows
const isWin = process.platform === "win32";
const exe = isWin ? "cloudflared.exe" : "./cloudflared";
const backendUrlFile = path.join(__dirname, "frontend", "public", "backend-url.txt");

let backendUrlPrinted = false;
let frontendUrlPrinted = false;

function handleTunnelOutput(label, saveToFile) {
  return (data) => {
    const str = data.toString();
    const match = str.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      if (label === "BACKEND" && !backendUrlPrinted) {
        if (saveToFile) fs.writeFileSync(backendUrlFile, match[0]);
        console.log(`URL FOR BACKEND: ${match[0]}`);
        backendUrlPrinted = true;
      }
      if (label === "FRONTEND" && !frontendUrlPrinted) {
        console.log(`URL FOR FRONTEND: ${match[0]}`);
        frontendUrlPrinted = true;
      }
    }
  };
}

// Start backend tunnel, this also saves the backend url to backend-url.txt
console.log("Starting backend cloudflared tunnel...");
const backendTunnel = spawn(exe, ["tunnel", "--url", "http://localhost:3000"]);
backendTunnel.stdout.on("data", handleTunnelOutput("BACKEND", true));
backendTunnel.stderr.on("data", handleTunnelOutput("BACKEND", true));
backendTunnel.on("error", (err) => {
  console.error("Failed to start backend cloudflared:", err);
});

// start frontend tunnel 
console.log("Starting frontend cloudflared tunnel...");
const frontendTunnel = spawn(exe, ["tunnel", "--url", "http://localhost:5173"]);
frontendTunnel.stdout.on("data", handleTunnelOutput("FRONTEND", false));
frontendTunnel.stderr.on("data", handleTunnelOutput("FRONTEND", false));
frontendTunnel.on("error", (err) => {
  console.error("Failed to start frontend cloudflared:", err);
});