import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export default function NavBar() {
    const { user, isOverseer, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <nav className="navbar">
            <span className="brand">Field Command</span>
            <div className="nav-links">
                <NavLink to="/">Dashboard</NavLink>
                <NavLink to="/personnel">Personnel</NavLink>
                {user && <NavLink to="/submit">Submit Report</NavLink>}
                {isOverseer && <NavLink to="/command">Review Queue</NavLink>}
            </div>
            <div className="nav-user">
                {user ? (
                    <>
                        <span>{user.username} &middot; {user.points} pts</span>
                        <button onClick={() => { logout(); navigate('/'); }}>Sign out</button>
                    </>
                ) : (
                    <NavLink to="/login">Sign in</NavLink>
                )}
            </div>
        </nav>
    );
}