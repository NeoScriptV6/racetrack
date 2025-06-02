

//Mostly Martin


import React, { useState, useEffect } from 'react';

import '../css/LeaderBoard.css';
import { useBackendSocket } from '../hooks/useBackendSocket';

const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen().catch((err) => {
            console.error(`Error attempting to exit full-screen mode: ${err.message}`);
        });
    }
};

const FLAG_COLORS = {
  Safe: "green",
  Hazard: "yellow",
  Danger: "red",
  Finish: "white",
};

const LeaderBoard = () => {
  const [socketRef, ready] = useBackendSocket();
  const [standings, setStandings] = useState([]);
  const [remainingTime, setRemainingTime] = useState(null);
  const [flag, setFlag] = useState("Danger");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!ready || !socketRef.current) return;

    const socket = socketRef.current;

    const handleLeaderboardData = (data) => {
      setStandings(data || []);
    };

    const handleTimerUpdate = (data) => {
      setRemainingTime(data.remainingTime);

    };
    const handleRaceSetToSafe = () => {
      setStandings([]);
      setRemainingTime(null);
a
    };

    const handleFlagUpdated = (data) => {
      setFlag(data.flag);
    };

    socket.emit('request-leaderboard');
    socket.on('leaderboard-data', handleLeaderboardData);
    socket.on('timer-update', handleTimerUpdate);
    socket.on('flag_updated', handleFlagUpdated);
    socket.on('race-set-to-safe', handleRaceSetToSafe);



    return () => {
      socket.off('leaderboard-data', handleLeaderboardData);
      socket.off('timer-update', handleTimerUpdate);
      socket.off('flag_updated', handleFlagUpdated);
    };
  }, [ready, socketRef]);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!ready) return <div>Loading...</div>;

  return (
    <div className={isFullscreen ? "fullscreen-content" : ""}>
      <div className="leaderboard-container">
        <h1>Leader Board</h1>
        {/* Full-Screen Button */}
        {!isFullscreen && (
          <button onClick={toggleFullScreen} className="fullscreen-button">
            Full-Screen Mode
          </button>
        )}
        <div className="flag-status">
          <strong>Flag Status:</strong>
          <span
            style={{
              display: "inline-block",
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: FLAG_COLORS[flag] || "gray",
              marginRight: 8,
              marginLeft: 8,
              border: "2px solid #222",
              verticalAlign: "middle",
            }}
            title={flag}
          ></span>
          <span>{flag}</span>
        </div>
        <div className="leaderboard">
          <h2>Leaderboard</h2>
          {remainingTime !== null && (
            remainingTime > 0 ? (
              <p className="timer">Time Remaining: {formatTime(remainingTime)}</p>
              
            ) : (
              <p className="timer">Race Ended</p>
            )
          )}
          {standings.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Car</th>
                  <th>Driver</th>
                  <th>Laps</th>
                  <th>Last Lap</th>
                  <th>Fastest Lap</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((entry, index) => (
                  <tr key={entry.carNumber}>
                    <td>{index + 1}</td>
                    <td>{entry.carNumber}</td>
                    <td>{entry.driver || '—'}</td>
                    <td>{entry.laps}</td>
                    <td>
                      {entry.lastLap && entry.lastLap > 0
                        ? (entry.lastLap / 1000).toFixed(2) + "s"
                        : "—"}
                    </td>
                    <td>
                      {entry.fastestLap && entry.fastestLap > 0
                        ? (entry.fastestLap / 1000).toFixed(2) + "s"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderBoard;