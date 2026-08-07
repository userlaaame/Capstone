import { useState, useEffect } from 'react';
import { request } from '../api/client';

export default function Personnel() {
    const [roster, setRoster] = useState([]);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                setRoster(await request('/users'));
                setStatus('ready');
            } catch (err) {
                setError(err.message);
                setStatus('failed');
            }
        }
        load();
    }, []);

    if (status === 'loading') return <p className="status-message">Loading personnel records...</p>;
    if (status === 'failed') return <p className="status-message">Failed: {error}</p>;

    return (
        <div className="page">
            <h2>Personnel roster</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                Rank is computed from contribution points, not stored.
            </p>

            <ul className="anomaly-list">
                {roster.map((person) => (
                    <li key={person._id} className="anomaly-row" style={{ cursor: 'default' }}>
                        <span className="row-number">
                            {person.username}
                            <span className="class-badge" style={{ marginLeft: 8, background: 'var(--panel)', color: 'var(--amber)' }}>
                                {person.rank}
                            </span>
                        </span>
                        <span className="row-meta">
                            {person.points} points &middot; {person.status}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}