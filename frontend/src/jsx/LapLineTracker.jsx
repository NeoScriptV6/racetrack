import React, { useState, useEffect } from 'react';
import '../css/LapLineTracker.css';
import { useBackendSocket } from '../hooks/useBackendSocket';

const LapLineTracker = () => {
  const [socketRef, ready] = useBackendSocket();
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [raceStatus, setRaceStatus] = useState('not started');
  const [cars, setCars] = useState({});

  useEffect(() => {
    if (!ready || !socketRef.current) return;

    if (localStorage.getItem("lapLine-auth") === "true") {
      setAuthenticated(true);
    }
    const socket = socketRef.current;

    const onRaceData = (data) => {
      setCars(data.cars || {});
      setRaceStatus(data.status || 'not started');
    };

    const onLapUpdated = (update) => {
      setCars((prev) => ({
        ...prev,
        [update.carNumber]: {
          ...prev[update.carNumber],
          lapCount: update.lapCount,
          fastestLap: update.fastestLap,
        },
      }));
    };

    socket.on('race-data', onRaceData);

    if (authenticated) {
      socket.emit('request-race-data');
    }

    socket.on('lap-updated', onLapUpdated);

    return () => {
      socket.off('race-data', onRaceData);
      socket.off('lap-updated', onLapUpdated);
    };
  }, [authenticated, ready, socketRef]);

  if (!ready) return <div>Loading...</div>;

  if (!authenticated) {
    return (
      <div className="auth-container">
        <h2>Enter Access Code</h2>
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          type="password"
        />
        <button
          onClick={() => {
            if (socketRef.current) {
              socketRef.current.emit("auth", { role: "observer", code }, (response) => {
                if (response.success){
                  localStorage.setItem("lapLine-auth", "true");
                  setAuthenticated(true);
                }
                else alert("Incorrect code, try again.");
              });
            }
          }}
        >
          Login
        </button>
      </div>
    );
  }

  const recordLap = (carNumber) => {
    if (raceStatus === 'running' && cars[carNumber] && socketRef.current) {
      socketRef.current.emit('record-lap', carNumber);
    }
  };

  return (
    <div className="lap-tracker-container">
      <h2>Lap-line Tracker</h2>
      <div className={`race-status ${raceStatus}`}>
        Status: {raceStatus.toUpperCase()}
      </div>
      <div className="car-buttons">
        {[1,2,3,4,5,6,7,8].map((carNumber) => {
          const isActive = !!cars[carNumber];
          return (
            <button
              key={carNumber}
              onClick={() => recordLap(carNumber)}
              disabled={raceStatus !== 'running' || !isActive}
              className={`car-button ${raceStatus !== 'running' || !isActive ? 'disabled' : ''}`}
            >
              <span className="car-number">Car #{carNumber}</span>
              {isActive ? (
                <div className="lap-info">
                  <span className="lap-count">Laps: {cars[carNumber].lapCount || 0}</span>
                  {cars[carNumber].fastestLap > 0 && (
                    <span className="fastest-lap">
                      Fastest Lap: {(cars[carNumber].fastestLap / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
              ) : (
                <div className="lap-info">Not racing</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LapLineTracker;