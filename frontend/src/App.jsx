import { Routes, Route } from 'react-router';
import NavBar from './components/NavBar.jsx';
//BLACKSITE: the telemetry strip closes the shell header on every screen
import TelemetryStrip from './components/TelemetryStrip.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Personnel from './pages/Personnel.jsx';
import Submit from './pages/Submit.jsx';
import Command from './pages/Command.jsx';
import Login from './pages/Login.jsx';
import AccessDenied from './pages/AccessDenied.jsx';

export default function App() {
    return (
        <div className="app">
            <NavBar />
            <TelemetryStrip />
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/personnel" element={<Personnel />} />
                <Route path="/submit" element={<Submit />} />
                <Route path="/command" element={<Command />} />
                <Route path="/login" element={<Login />} />
                <Route path="/denied" element={<AccessDenied />} />
            </Routes>
        </div>
    );
}
