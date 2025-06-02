import React, { useState, useEffect } from "react";
import { useBackendSocket } from "../hooks/useBackendSocket";
import "../css/RaceFlags.css";

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

const RaceFlags = () => {
    const [socketRef, ready] = useBackendSocket();
    const [flagColor, setFlagColor] = useState("red"); 
    const [isCheckered, setIsCheckered] = useState(false); 
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handleChange);
        return () => document.removeEventListener("fullscreenchange", handleChange);
    }, []);

    useEffect(() => {
        if (!ready || !socketRef.current) return;

        const socket = socketRef.current;

        const handleFlagUpdated = (data) => {
            if (data.flag === "Safe") {
                setFlagColor("green");
                setIsCheckered(false);
            } else if (data.flag === "Hazard") {
                setFlagColor("yellow");
                setIsCheckered(false);
            } else if (data.flag === "Danger") {
                setFlagColor("red");
                setIsCheckered(false);
            } else if (data.flag === "Finish") {
                setFlagColor("white");
                setIsCheckered(true);
            }
        };

        socket.on("flag_updated", handleFlagUpdated);

        return () => {
            socket.off("flag_updated", handleFlagUpdated);
        };
    }, [ready, socketRef]);

    if (!ready) return <div>Loading...</div>;

    return (
        <div className="race-flags-container">
            <h1></h1>
            {/* Full-Screen Button */}
            {!isFullscreen && (
                <button onClick={toggleFullScreen} className="fullscreen-button">
                    Full-Screen Mode
                </button>
            )}
            <div
                className={`flag ${isCheckered ? "checkered" : ""}`}
                style={{ backgroundColor: isCheckered ? "transparent" : flagColor }}
            ></div>
            <div className={isFullscreen ? "fullscreen-content" : ""}>
             
            </div>
        </div>
    );
};

export default RaceFlags;