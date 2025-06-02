import React, { useState, useEffect } from 'react';
import { useBackendSocket } from '../hooks/useBackendSocket';
import '../css/NextRace.css'; 

const NextRace = () => {
    const [socketRef, ready] = useBackendSocket();
    const [races, setRaces] = useState([]);
    const [nextRace, setNextRace] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showPaddock, setShowPaddock] = useState(false);

    useEffect(() => {
        const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handleChange);
        return () => document.removeEventListener("fullscreenchange", handleChange);
    }, []);

    useEffect(() => {
        if (!ready || !socketRef.current) return;

        const socket = socketRef.current;

        const handleLoadRaces = (data) => {
            setRaces(data.rows);

            const now = Date.now() / 1000;
            // Find all upcoming races (not stopped, in the future)
            const upcomingRaces = data.rows
                .filter(race => race.stopped === 0 && race.race_start_time > now)
                .sort((a, b) => a.race_start_time - b.race_start_time);

            // Find the next race that is NOT safe to start
            const next = upcomingRaces.find(race => race.safe_to_start === 0) || null;

            // Show paddock only if there is an upcoming race, none are safe to start, and no race is active
            const anySafeToStart = upcomingRaces.some(race => race.safe_to_start === 1);
            const anyStopped = data.rows.some(race => race.stopped === 1);

            setShowPaddock(upcomingRaces.length > 0 && !anySafeToStart && !anyStopped);
            setNextRace(next);
        };
        
        const update = () => {
            socketRef.current.emit('load-races');
        }
        socket.on('load_races', handleLoadRaces);
        socket.on('race-set-to-safe', update);
        socket.on('race-stopped', update);
        socket.on('race-data', update);
       
        
        
        return () => {
        socket.off('load_races', handleLoadRaces);
        socket.off('race-set-to-safe', update);
        socket.off('race-stopped', update);
        socket.off('race-data', update);
    };
    }, [ready, socketRef]);

    if (!ready) return <div>Loading...</div>;

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div className={isFullscreen ? "fullscreen-content" : ""}>
            {!isFullscreen && (
                <button onClick={toggleFullScreen} className="fullscreen-button">
                    Full-Screen Mode
                </button>
            )}

            {showPaddock ? (
                <div className="paddock-message">
                    <h2>Please proceed to the paddock.</h2>
                </div>
            ) : nextRace ? (
                <div className="next-race-container">
                    <h1>Next Race</h1>
                    <div className="next-race">
                        <h2>{nextRace.race_name}</h2>
                        <p>Start Time: {new Date(nextRace.race_start_time * 1000).toLocaleString()}</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Driver</th>
                                    <th>Car</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nextRace.drivers.map((driver, index) => (
                                    <tr key={index}>
                                        <td>{driver.name}</td>
                                        <td>{driver.car_number}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div id="noRaces">No upcoming races found.</div>
            )}
        </div>
    );
};

export default NextRace;