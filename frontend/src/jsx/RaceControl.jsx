import '../css/RaceControl.css'
import React, { useState, useEffect, useRef } from 'react';
import { useBackendSocket } from "../hooks/useBackendSocket";

function RaceControl() {
    const [socketRef, ready] = useBackendSocket();
    const [races, setRaces] = useState([]);
    const [upcomingRace, setUpcomingRace] = useState(null);
    const [currentFlag, setCurrentFlag] = useState("Default");
    const [raceRunning, setRaceRunning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(null);
    const [currentColor, setCurrentColor] = useState("green");
    const [safeToStart, setSafeToStart] = useState(false);
    const [isFinish, setIsFinish] = useState(false);
    const [clickedStart, setClickedStart] = useState(false);    
    const [authenticated, setAuthenticated] = useState(false);
    const [code, setCode] = useState("");
    const lastRaceIdRef = useRef(null);
    useEffect(() => {
        if (!ready || !socketRef.current) return;

        if(localStorage.getItem("raceControl-auth") === "true"){
            setAuthenticated(true);
        }
        const socket = socketRef.current;

        const handleFlagUpdated = (data) => {
            let flag = data.flag;
            setCurrentFlag(flag);
            if (flag === "Safe") {
                setCurrentColor("green");
                setIsFinish(false)
            } else if (flag === "Hazard") {
                setCurrentColor("yellowgreen");
                setIsFinish(false)
            } else if (flag === "Danger") {
                setCurrentColor("red");
                setIsFinish(false)
            } else if (flag === "Finish") {
                setCurrentColor("blue");
                setIsFinish(true)
            }
        };

        const handleTimerUpdate = (data) => {
            setRemainingTime(data.remainingTime);

        };

        const handleRaceState = (data) => {
            if(data.safe){
                setSafeToStart(true);
            }
        };

        const handleLoadRaces = (data) => {
            setRaces(data.rows);

            const now = Math.floor(Date.now() / 1000);
            const nextRace = data.rows
                .filter((race) => race.race_start_time > now) 
                .sort((a, b) => a.race_start_time - b.race_start_time)[0];

            setUpcomingRace(nextRace || null);
            if (nextRace) lastRaceIdRef.current = nextRace.race_id;
            if(nextRace && nextRace.safe_to_start){
                setSafeToStart(true);
            }
            if(nextRace && nextRace.stopped){
                setRaceRunning(false);
                setClickedStart(true);
            }
            if(nextRace && nextRace.active){
                setRaceRunning(true);
            } else {
                setRaceRunning(false);
            }
            if(nextRace) setRemainingTime(nextRace.remainingTime);

            if(nextRace) socket.emit("get_flag", nextRace.race_id);
        };

        socketRef.current.on("flag_updated", handleFlagUpdated);
        socketRef.current.on("timer-update", handleTimerUpdate);
        socketRef.current.on("race_state", handleRaceState);
        socketRef.current.on("load_races", handleLoadRaces);
        socketRef.current.on("timer-ran-out", stopRace)
        return () => {
            socketRef.current.off("flag_updated", handleFlagUpdated);
            socketRef.current.off("timer-update", handleTimerUpdate);
            socketRef.current.off("race_state", handleRaceState);
            socketRef.current.off("load_races", handleLoadRaces);
            socketRef.current.off("timer-ran-out", stopRace)

        };
    }, [ready, socketRef]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

    function handleFlagChange(flag) {
        setCurrentFlag(flag);
        if (flag === "Safe") {
            setCurrentColor("green");
        } else if (flag === "Hazard") {
            setCurrentColor("yellowgreen");
        } else if (flag === "Danger") {
            setCurrentColor("red");
        } else if (flag === "Finish") {
            stopRace();
            return;
        }
        if (socketRef.current && upcomingRace)
            socketRef.current.emit("update_flag", { race_id : upcomingRace.race_id , flag:flag });
    }

    const startRace = () => {
        if (socketRef.current && upcomingRace) {
            socketRef.current.emit("start-race", {race_id: upcomingRace.race_id});
            setRaceRunning(true);
            setClickedStart(true);
            handleFlagChange("Safe");

        }
    };

    const stopRace = () => {
        console.log("stopping race")
        const raceId = lastRaceIdRef.current;
        if (socketRef.current && raceId) {
            socketRef.current.emit("stop-race", { race_id: raceId });
            setRaceRunning(false);
            setIsFinish(true)
            setCurrentColor("blue");
            const flag = "Finish";
            setCurrentFlag(flag);
            socketRef.current.emit("update_flag", { race_id: raceId  , flag:flag });
        }
    };

    const setSafe = () => {
        if (socketRef.current && upcomingRace) {
            socketRef.current.emit("set-safe-to-start", { safe: true, raceId: upcomingRace.race_id });
            setSafeToStart(true);
        }
    }

    const endRace = () => {
        if (upcomingRace && socketRef.current) {
            if (window.confirm(`Are you sure you want to end the race "${upcomingRace.race_name}"?`)) {
                const flag = "Danger";
                setCurrentFlag(flag);
                socketRef.current.emit("update_flag", { race_id : upcomingRace.race_id , flag:flag });
                socketRef.current.emit("delete_race", upcomingRace.race_id);
                socketRef.current.emit("load_races");
                setUpcomingRace(null);
                setSafeToStart(false);
                setIsFinish(false);
                setClickedStart(false);
            }
        }
    };

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
                            socketRef.current.emit("auth", { role: "safety", code }, (response) => {
                                if (response.success){
                                    localStorage.setItem("raceControl-auth", "true");
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

    return (
        <div className="RaceControlContainer">
            <div className="RaceControlTopBar">
                <p className="RaceControlTopBarTitle">Race Control</p>
            </div>
            <div className="bottomContainer">
                {upcomingRace && safeToStart ? (
                    <div className="ToggleContainer" style={{ display: "flex" }}>
                        <p className="ToggleTitle">Current Race</p>
                        <p>Race Name: {upcomingRace.race_name}</p>
                        <p>Start Time: {new Date(upcomingRace.race_start_time * 1000).toLocaleString()}</p>
                        <button style={{display: isFinish ? "flex" : "none"}} className="ToggleButton" onClick={endRace}>End Race</button>
                    </div>
                ) : (
                    <div className="ToggleContainer" style={{ display: "flex" }}>
                        <p className="ToggleTitle">Upcoming Race</p>
                        {upcomingRace ? (
                            <>
                                <p>Race Name: {upcomingRace.race_name}</p>
                                <p>Start Time: {new Date(upcomingRace.race_start_time * 1000).toLocaleString()}</p>
                                <button className="ToggleButton" onClick={setSafe} disabled={!upcomingRace}>
                                    Set Safe
                                </button>
                            </>
                        ) : (
                            <p>No upcoming races found.</p>
                        )}
                    </div>
                )}
                
                <div className="ToggleContainer" style={{display: safeToStart && raceRunning ? "flex" : "none"}}>
                    <p className="ToggleTitle">Toggle Flag</p>
                    <button className="ToggleButton" onClick={() => handleFlagChange("Safe")}>Safe</button>
                    <button className="ToggleButton" onClick={() => handleFlagChange("Hazard")}>Hazard</button>
                    <button className="ToggleButton" onClick={() => handleFlagChange("Danger")}>Danger</button>
                    <button className="ToggleButton" onClick={() => handleFlagChange("Finish")}>Finish</button>
                    <p style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                        Current flag:
                        <span style={{ color: currentColor, fontSize: "30px", marginLeft: "5px" }}>{currentFlag}</span>
                    </p>
                </div>
                <div className="ToggleContainer" style={{display: safeToStart ? "flex" : "none"}}>
                    <p className="ToggleTitle">Toggle Race</p>
                    <button style={ {display: clickedStart || raceRunning ? "none" : "flex"}} className="ToggleButton" onClick={startRace}>Start Race</button>
                    <button style={ {display: raceRunning ? "flex" : "none"}} className="ToggleButton" onClick={stopRace}>Stop Race</button>

                    <p style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        Current State:
                        <span style={{ fontSize: "30px", marginLeft: "5px" }}>
                        {typeof remainingTime === "number" && !isNaN(remainingTime) ? formatTime(remainingTime) : "Not started"}
                        
                        
                    </span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default RaceControl;