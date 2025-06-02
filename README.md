# Beachside Racetrack Info-Screens

A real-time system for managing and displaying race sessions, lap times, and safety information at Beachside Racetrack.

---

## Table of Contents

- [Project Overview](#project-overview)
- [How to Launch](#how-to-launch)
- [Environment Variables](#environment-variables)
- [User Guide](#user-guide)
  - [Front Desk](#front-desk)
  - [Race Control](#race-control)
  - [Lap-line Tracker](#lap-line-tracker)
  - [Leader Board](#leader-board)
  - [Next Race](#next-race)
  - [Race Countdown](#race-countdown)
  - [Race Flags](#race-flags)
- [Cloudflared Tunnel (Remote Access)](#cloudflared-tunnel-remote-access)
- [Technology Stack](#technology-stack)
- [Development Notes](#development-notes)

---

## Project Overview

Beachside Racetrack Info-Screens is a real-time, multi-interface system for managing race sessions, controlling race safety, recording lap times, and informing drivers and spectators. The system is designed to reduce staff workload and provide up-to-date information to all stakeholders.

---

## How to Launch

1. **Clone the repository:**
   
   ```sh
   git clone <your-repo-url>
   cd pair-program
   ```

2. **Download Cloudflared:**
   
   - Go to [https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
   - Download the Windows version of Cloudflared.
   - **Rename the downloaded executable to `cloudflared.exe`** (if it is not already named that).
   - Move `cloudflared.exe` into the root of this project (same folder as `package.json`).

3. **Install dependencies:**
   
   ```sh
   npm install
   ```

4. **Set environment variables:**
    Create a `.env` file in the project root with the following content:
   
   ```
   RECEPTIONIST_KEY=your_receptionist_key
   SAFETY_KEY=your_safety_key
   OBSERVER_KEY=your_observer_key
   ```

5. **Start the server and frontend:**
   
   - For production (10-minute races):
     
     ```sh
     npm start
     ```
   
   - For development (1-minute races):
     
     ```sh
     npm run dev
     ```
   
   - For offline only (Doesnt need cloudflared.exe):
     
     ```sh
     npm run local:start
     ```
     
     or
     
     ```sh
     npm run local:dev
     ```

6. **Access the interfaces:**
   
   - Open a browser and go to `http://<your-server-ip>:5173/`
   - Each interface is available at its own route (see below).
   - **Your server IP and Cloudflared public URLs will be displayed in the command terminal after starting the server.**

---

## Environment Variables

- `RECEPTIONIST_KEY` — Access code for Front Desk
- `SAFETY_KEY` — Access code for Race Control
- `OBSERVER_KEY` — Access code for Lap-line Tracker

**The server will not start unless all three are set.**

---

## User Guide

### Front Desk (`/front-desk`)

- **Role:** Receptionist
- **Functionality:**
  - View, add, edit, and delete upcoming race sessions.
  - Assign drivers to cars (driver names must be unique per race).
  - Edit or remove drivers before the race is set to "safe to start".
  - Races disappear from the list once they are "safe to start".
- **Access:** Requires receptionist access code.

---

### Race Control (`/race-control`)

- **Role:** Safety Official
- **Functionality:**
  - See the next race session and its drivers/cars.
  - Start the race (sets mode to "Safe").
  - Control race modes: Safe (green), Hazard (yellow), Danger (red), Finish (chequered).
  - End the race session (sets mode to "Danger" and queues next session).
  - See a message if there are no upcoming races.
- **Access:** Requires safety official access code.

---

### Lap-line Tracker (`/lap-line-tracker`)

- **Role:** Lap-line Observer
- **Functionality:**
  - See large buttons for each car in the current race.
  - Tap a button when a car crosses the lap line (updates leaderboard in real time).
  - Buttons are disabled or hidden between races.
- **Access:** Requires observer access code.

---

### Leader Board (`/leader-board`)

- **Role:** Guest/Spectator
- **Functionality:**
  - View fastest lap, current lap, driver name, car number, remaining time, and flag status for each car.
  - Leaderboard is ordered by fastest lap times.
  - Updates in real time as laps are recorded.
  - Shows last race’s results until the next race starts.
  - Includes a button to enter full-screen mode.

---

### Next Race (`/next-race`)

- **Role:** Race Driver
- **Functionality:**
  - See the upcoming race session, assigned cars, and drivers.
  - When a race ends, see a message to proceed to the paddock.
  - Includes a button to enter full-screen mode.

---

### Race Countdown (`/race-countdown`)

- **Role:** Race Driver
- **Functionality:**
  - Displays the countdown timer for the current race.
  - Includes a button to enter full-screen mode.

---

### Race Flags (`/race-flags`)

- **Role:** Race Driver
- **Functionality:**
  - Displays the current flag (Safe, Hazard, Danger, Finish) in full screen.
  - Updates in real time as the Safety Official changes the mode.
  - Includes a button to enter full-screen mode.

---

## Cloudflared Tunnel (Remote Access)

Remote access is enabled using Cloudflared.  
**Note:** You must have `cloudflared.exe` in your project root for the app to work(If you want to run it online).  
See [How to Launch](#how-to-launch) for download and setup instructions.

---

## Technology Stack

- **Backend:** Node.js, Express, Socket.IO, SQLite
- **Frontend:** React, Vite, Socket.IO-client
- **Real-time:** All updates are pushed via Socket.IO
- **Security:** Employee interfaces require access keys set as environment variables

---

## Development Notes

- **Data Persistence:**  
  Data is persisted in SQLite.
- **Access Control:**  
  If an incorrect access key is entered, the server waits 500ms before responding and the interface re-prompts for the key.

---
