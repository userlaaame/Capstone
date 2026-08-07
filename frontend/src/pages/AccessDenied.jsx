import { Link } from 'react-router';

export default function AccessDenied() {
    return (
        <div className="page">
            <h2 style={{ color: 'var(--keter)' }}>ACCESS DENIED</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                This record does not exist, or your clearance level is insufficient to view it.
                This access attempt has been logged.
            </p>
            <Link to="/" style={{ color: 'var(--amber)', fontSize: 13 }}>Return to dashboard</Link>
        </div>
    );
}