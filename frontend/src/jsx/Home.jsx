import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/Home.css";

function Home() {
  const navigate = useNavigate();

  const handleRoute = (route) => {
    navigate(route);
  };

  return (
    <div className="home-container">
      <div className="title">
        <h1>🏁 Beachside Racetrack</h1>
        <p>Welcome! Choose your interface below.</p>
      </div>

      <div className="sections">
        <div className="card user-interfaces">
          <h2>👤 User Interfaces</h2>
          <ul>
            <li>
              <button className="home-btn" onClick={() => handleRoute("/front-desk")}>
                🛎️ Front Desk (Receptionist)
              </button>
            </li>
            <li>
              <button className="home-btn" onClick={() => handleRoute("/race-control")}>
                🚦 Race Control (Safety Official)
              </button>
            </li>
            <li>
              <button className="home-btn" onClick={() => handleRoute("/lap-line-tracker")}>
                🏎️ Lap-line Tracker (Lap-line Observer)
              </button>
            </li>
          </ul>
        </div>
        <div className="card public-displays">
          <h2>📺 Public Displays</h2>
          <ul>
            <li>
              <button className="home-btn" onClick={() => handleRoute("/leaderboard")}>
                🏆 Leader Board (Guest)
              </button>
            </li>
            <li>
              <button className="home-btn" onClick={() => handleRoute("/next-race")}>
                ⏭️ Next Race (Race Driver)
              </button>
            </li>
            <li>
              <button className="home-btn" onClick={() => handleRoute("/race-countdown")}>
                ⏳ Race Countdown (Race Driver)
              </button>
            </li>
            <li>
              <button className="home-btn" onClick={() => handleRoute("/race-flags")}>

                🚩 Race Flags (Race Driver)
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Home;