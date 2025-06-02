// Mostly Martin

import React, { useState, useEffect } from "react";
import { useBackendSocket } from "../hooks/useBackendSocket";
import "../css/RaceCountdown.css";

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

const RaceCountdown = () => {
  const [socketRef, ready] = useBackendSocket();
  const [remainingTime, setRemainingTime] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    if (!ready || !socketRef.current) return;

    const socket = socketRef.current;

    const handleTimerUpdate = (data) => {
      setRemainingTime(data.remainingTime);
    };



    socket.on("timer-update", handleTimerUpdate);

    return () => {
      socket.off("timer-update", handleTimerUpdate);
      socket.off("flag_updated", handleFlagUpdated);
    };
  }, [ready, socketRef]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!ready) return <div>Loading...</div>;

  return (
    <div className={isFullscreen ? "fullscreen-content" : ""}>
      <div className="race-countdown-container">
        <h2>Race Countdown</h2>
        {/* Full-Screen Button */}
        {!isFullscreen && (
          <button onClick={toggleFullScreen} className="fullscreen-button">
            Full-Screen Mode
          </button>
        )}
        {remainingTime !== null ? (
          <p className="timer">Time Remaining: {formatTime(remainingTime)}</p>
        ) : (
          <p className="timer">Waiting for race to start...</p>
        )}
      </div>
    </div>
  );
};

export default RaceCountdown;