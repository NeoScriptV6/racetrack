import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RaceFlags from './jsx/RaceFlags.jsx';
import FrontDesk from './jsx/FrontDesk.jsx';
import RaceControl from './jsx/RaceControl.jsx';
import LapLineTracker from './jsx/LapLineTracker.jsx';
import Home from './jsx/Home.jsx';
import LeaderBoard from './jsx/LeaderBoard.jsx';
import NextRace from './jsx/NextRace.jsx';
import RaceCountdown from './jsx/RaceCountdown.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/race-flags" element={<RaceFlags />} />
        <Route path="/race-control" element={<RaceControl />} />
        <Route path="/front-desk" element={<FrontDesk />} />
        <Route path="/lap-line-tracker" element={<LapLineTracker />} /> 
        <Route path="/leaderboard" element={<LeaderBoard />} />
        <Route path="/next-race" element={<NextRace />} />
        <Route path="/race-countdown" element={<RaceCountdown />} />
      </Routes>
    </Router>
  );
}

export default App;