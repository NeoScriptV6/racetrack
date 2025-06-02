import { useState, useEffect } from "react";
import { useBackendSocket } from "../hooks/useBackendSocket";
import "../css/FrontDesk.css";

function FrontDesk() {
    const [socketRef, ready] = useBackendSocket();
    const [races, setRaces] = useState([]);
    const cars = [1, 2, 3, 4, 5, 6, 7, 8];
    const [formOpen, setFormState] = useState("none");
    const [blurOpen, setBlurState] = useState("none");
    const [editRace, setEditRace] = useState("none");
    const [currentRaceIndex, setRaceIndex] = useState(-1);
    const [currentRaceId, setRaceId] = useState(-1);
    const [authenticated, setAuthenticated] = useState(false);
    const [code, setCode] = useState("");

    useEffect(() => {
        if (!ready || !socketRef.current) return;

        // see if user is already authenticated
        if (localStorage.getItem("frontdesk-auth") === "true") {
            setAuthenticated(true);
        }
        const socket = socketRef.current;

        socket.on("load_races", (data) => {
            setRaces(data.rows);
            console.log(data.rows);
        });
        socket.on("race-set-to-safe", (raceId) => {
            setRaces((prevRaces) => prevRaces.filter((race) => race.race_id !== raceId));
        });

        return () => {
            socket.off("load_races");
            socket.off("race-set-to-safe");
        };
    }, [ready, socketRef]);

    function clearForms(){
        document.getElementById("raceName").value = "";
        document.getElementById("raceDate").value = "";
        document.getElementById("raceTime").value = "";
        cars.forEach((nr) => {
            document.getElementById(`car${nr}`).value = "";
        });
    }

    function AddRaceButtonClicked() {
        clearForms();
        setFormState("flex");
        setBlurState("flex");
    }

    function closeForm() {
        clearForms();

        setFormState("none");
        setEditRace("none");
        setBlurState("none");
    
    }

    function clickEditRace(raceIndex, raceId) {
        setRaceId(raceId);
        setRaceIndex(raceIndex);
        setEditRace("flex"); 
        setBlurState("flex");
    } 

    const addRace = () => {
        const socket = socketRef.current;
        const raceName = document.getElementById("raceName").value.trim();
        const raceDate = document.getElementById("raceDate").value;
        const raceTime = document.getElementById("raceTime").value;
    
        if (!raceName) {
            alert("Please enter a race name.");
            return;
        }
    
        if (!raceDate || !raceTime) {
            alert("Please select both a valid date and time.");
            return;
        }
    
        const selectedDateTime = new Date(`${raceDate}T${raceTime}`);
        const now = new Date();
    
        // Check if the selected date and time are in the past
        if (selectedDateTime < now) {
            alert("You cannot select a past date and time. Please choose a valid future date and time.");
            return;
        }
    
        let drivers = [];
        let duplicateExists = false;
        cars.forEach((nr) => {
            let driverName = document.getElementById(`car${nr}`).value.trim();

            if (isDriverNameDuplicateInSameRace(driverName, drivers)) {
                    alert(`Driver name "${driverName}" is already added to this race.`);
                    duplicateExists = true;
                    return 0; 
            }

            if (driverName.length > 0) { 
                drivers.push({ name: driverName, carNumber: nr }); 
            }
        });
        if(duplicateExists){
            return;
        }
        const raceDateTime = selectedDateTime.getTime() / 1000;
    
        if (drivers.length > 1) {
            let raceData = {
                raceName: raceName, 
                raceDateTime: raceDateTime,
                drivers: drivers,
            };
            socket.emit("add_race", raceData);
        } else {
            alert("Please enter at least 2 drivers.");
        }
        closeForm();
        window.location.reload();
    };

    function deleteRace(raceId) {
        const socket = socketRef.current;
        if (window.confirm("Are you sure you want to delete this race?")) {
            socket.emit("delete_race", raceId);
        }
    }

    function updateRace(){
        const socket = socketRef.current;
        if (currentRaceId < 0) {
            alert("No race selected to save.");
            return;
        }

        let drivers = [];
        let duplicateExists = false;
        cars.forEach((nr) => {
            let driverName = document.getElementById(`editcar${nr}`).value.trim();

            if (driverName.length > 0) {
                if (isDriverNameDuplicateInSameRace(driverName, drivers)) {
                alert(`Driver name "${driverName}" is already added to this race.`);
                    duplicateExists = true;
                    return 0;
                }
                drivers.push({ name: driverName, car_number: nr }); 
            }
        });

        if( duplicateExists){
            return 0;
        }
        if (drivers.length > 0) {
            const raceData = {
                raceId: currentRaceId, 
                drivers: drivers, 
            };
            socket.emit("update_race", raceData, () => {

                socket.emit("load_races");
            });
        } else {
            alert("Please enter at least one driver.");
        }
        closeForm();
    }

    function isDriverNameDuplicateInSameRace(driverName, drivers) {
        return drivers.some((driver) => driver.name.toLowerCase() === driverName.toLowerCase());
    }

    if (!ready) return <div>Loading...</div>;

    // Prompt for code if not authenticated
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
                            socketRef.current.emit("auth", { role: "receptionist", code }, (response) => {
                                if (response.success){
                                    localStorage.setItem("frontdesk-auth", "true");
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
        <>
            <div onClick={closeForm} className="FormBackground" style={{ display: blurOpen}}></div>
            <div className="FrontDeskForm"  style={{ display: editRace }}>
                {cars.map((nr) => (
                    <div key={nr} className="FormElem">
                        <p className="FormElemCarNr">Car {nr}</p>
                        <input
                            id={`editcar${nr}`}
                            type="text"
                            className="FrontDeskFormInput"
                            placeholder="Driver's full name"
                            defaultValue={
                                (() => {
                                    if (currentRaceId >= 0) {
                                        const race = races[currentRaceIndex];
                                        const driver = race.drivers.find((driver) => driver.car_number == nr);
                                        return driver ? driver.name : ""; 
                                    }
                                    return "";
                                })()
                            }
                        />
                    </div>
                ))}
                <div className="FormButtons">
                    <button onClick={updateRace} className="AddRaceButton">Save Race</button>
                    <button onClick={closeForm} className="CloseFormButton">Close</button>
                </div>
            </div>
            <div className="FrontDeskForm" style={{ display: formOpen }}>
            <p className="FormElemCarNr" style={{ marginTop: "20px" }}>Race Name</p>
                <input
                    id="raceName"
                    type="text"
                    className="FrontDeskFormInput"
                    placeholder="Enter race name"
                />
                {cars.map((nr) => (
                    <div key={nr} className="FormElem">
                        <p className="FormElemCarNr">Car {nr}</p>
                        <input
                            id={`car${nr}`}
                            type="text"
                            className="FrontDeskFormInput"
                            placeholder="Driver's full name"
                        />
                    </div>
                ))}
                <p className="FormElemCarNr" style={{ marginTop: "40px" }}>Race Date</p>
                <input id="raceDate" type="date" className="FrontDeskDateInput" min={new Date().toISOString().split("T")[0]} />

                <p className="FormElemCarNr">Race Time</p>
                <input id="raceTime" type="time" className="FrontDeskTimeInput" />
                <div className="FormButtons">
                    <button onClick={addRace} className="AddRaceButton">Add Race</button>
                    <button onClick={closeForm} className="CloseFormButton">Close</button>
                </div>
            </div>

            <div className="FrontDeskContainer">
                <div className="FrontDeskTopBar">
                    <p className="FrontDeskTitle">Front Desk</p>
                </div>
                <div className="FrontDeskBottom">
                    <div className="FrontDeskRaces">
                        {races.filter((race) => !race.safe_to_start).length > 0 ? (
                            <table className="RaceTable">
                                <thead>
                                    <tr>
                                        <th>Race Name</th>
                                        <th>Start Time</th>
                                        <th>Drivers</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {races
                                        .filter((race) => !race.safe_to_start) // Excludingg races with safe_to_start set to true
                                        .sort((a, b) => a.race_start_time - b.race_start_time) // Sorting by race_start_time
                                        .map((race, index) => (
                                            <tr key={index}>
                                                <td>{race.race_name}</td>
                                                <td>{new Date(race.race_start_time * 1000).toLocaleString()}</td>
                                                <td>
                                                    {race.drivers.map((driver, i) => (
                                                        <div key={i}>
                                                            {driver.name} (Car {driver.car_number})
                                                        </div>
                                                    ))}
                                                </td>
                                                <td>
                                                    <button
                                                        className="DeleteRaceButton"
                                                        onClick={() => deleteRace(race.race_id)}
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        className="EditRaceButton"
                                                        onClick={() => clickEditRace(index, race.race_id)}
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="NoRacesToShow">No races found..</p>
                        )}
                    </div>
                    <button className="AddRaceButton" onClick={AddRaceButtonClicked}>Add Race</button>
                </div>
            </div>
        </>
    );
}

export default FrontDesk;