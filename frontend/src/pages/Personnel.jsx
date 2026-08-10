import { useState, useEffect } from 'react';
import { request } from '../api/client';

//BLACKSITE: the roster is a four-column readout, not a list. Columns come from
//the fields /users actually returns - username, rank, points, status.
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

    if (status === 'loading') return <p className="status-message">Establishing secure connection...</p>;
    if (status === 'failed') return <p className="status-message">Connection failed: {error}</p>;

    const pad = (n) => String(n).padStart(2, '0');
    const counts = roster.reduce((acc, p) => {
        const k = (p.status || 'ACTIVE').toUpperCase();
        acc[k] = (acc[k] || 0) + 1;
        return acc;
    }, {});
    const summary = Object.entries(counts).map(([k, v]) => `${k} ${pad(v)}`).join(' // ');

    return (
        <div className="page" style={{ maxWidth: 'none' }}>
            <p className="page-code">
                ROSTER {pad(roster.length)}/{pad(roster.length)} &mdash; SITE-19 STANDING COMPLEMENT
            </p>
            <div className="page-head">
                <h2>PERSONNEL</h2>
                <span className="page-note">
                    {summary || 'NO RECORDS'}
                    <span className="dim">RANK IS COMPUTED FROM CONTRIBUTION POINTS, NOT STORED</span>
                </span>
            </div>

            {roster.length === 0 ? (
                <p className="empty-state">No records match current parameters.</p>
            ) : (
                <div className="roster">
                    <div className="roster-head">
                        <span>PERSONNEL</span>
                        <span>CLEARANCE</span>
                        <span>POINTS</span>
                        <span>STATUS</span>
                    </div>
                    {roster.map((person) => {
                        const state = (person.status || 'ACTIVE').toUpperCase();
                        return (
                            <div className="roster-row" key={person._id}>
                                <span className="roster-name">{person.username}</span>
                                <span className="roster-clearance">{person.rank}</span>
                                <span className="roster-points">{person.points}</span>
                                <span className={`roster-status ${state === 'REDACTED' ? 'redacted' : state === 'OPEN' ? 'open' : ''}`}>
                                    {state}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
