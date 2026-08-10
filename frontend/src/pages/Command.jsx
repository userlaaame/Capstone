import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnomalies } from '../context/AnomalyContext.jsx';
import { request } from '../api/client.js';

const OBJECT_CLASSES = ['Safe', 'Euclid', 'Keter', 'Thaumiel', 'Neutralized'];
const pad = (n) => String(n).padStart(2, '0');

//BLACKSITE: master/detail. The queue is a list of reports on the left and ONE
//open report on the right stacking full verification forms meant an overseer
//scrolled past four forms to reach the fifth report.
export default function Command() {
    const { user, isOverseer, token } = useAuth();
    const { loadScps } = useAnomalies();

    const [pending, setPending] = useState([]);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [openId, setOpenId] = useState(null);
    //verification fields, keyed by report id so each row keeps its own draft
    const [drafts, setDrafts] = useState({});

    const loadPending = useCallback(async () => {
        setStatus('loading');
        try {
            setPending(await request('/scps/pending', { token }));
            setStatus('ready');
        } catch (err) {
            setError(err.message);
            setStatus('failed');
        }
    }, [token]);

    useEffect(() => { if (isOverseer) loadPending(); }, [isOverseer, loadPending]);

    if (!user) return <Navigate to="/login" replace />;
    if (!isOverseer) return <Navigate to="/denied" replace />;

    const updateDraft = (id, field, value) =>
        setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: value } }));

    async function handleVerify(id) {
        setError(null);
        setBusyId(id);
        try {
            const draft = drafts[id] || {};
            await request(`/scps/${id}/verify`, {
                method: 'PATCH',
                token,
                body: {
                    itemNumber: draft.itemNumber,
                    objectClass: draft.objectClass,
                    containmentProcedures: draft.containmentProcedures,
                    ...(draft.series && { series: Number(draft.series) }),
                },
            });
            await Promise.all([loadPending(), loadScps()]);
            setOpenId(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    }

    async function handleReject(id) {
        setError(null);
        setBusyId(id);
        try {
            await request(`/scps/${id}/reject`, { method: 'PATCH', token });
            await loadPending();
            setOpenId(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    }

    if (status === 'loading') return <p className="status-message">Establishing secure connection...</p>
    if (status === 'failed') return <p className="status-message">Connection failed: {error}</p>

    const selected = pending.find((r) => r._id === openId) || pending[0] || null;
    const draft = selected ? (drafts[selected._id] || {}) : {};

    return (
        <div className="queue-body">
            <aside className="queue-list">
                <div className="queue-list-head">
                    <p className="page-code" style={{ margin: 0 }}>
                        QUEUE {pad(pending.length)}/{pad(pending.length)} &mdash; AWAITING CLASSIFICATION
                    </p>
                    <p style={{ fontFamily: 'var(--bs-micro)', fontSize: 9, letterSpacing: 'var(--bs-track-code)', color: 'var(--bs-recessed)', margin: '6px 0 0', lineHeight: 1.9 }}>
                        VERIFICATION ASSIGNS AN ITEM NUMBER AND AWARDS THE SUBMITTER 50 POINTS
                    </p>
                </div>

                {pending.length === 0 ? (
                    <p className="empty-state">Queue clear. No pending reports.</p>
                ) : (
                    <ul>
                        {pending.map((report) => (
                            <li
                                key={report._id}
                                className={selected && report._id === selected._id ? 'anomaly-row selected' : 'anomaly-row'}
                                onClick={() => setOpenId(report._id)}
                            >
                                <span className="row-number">{report.title}</span>
                                <span className="row-meta">
                                    BY {report.submittedBy?.username ?? 'UNKNOWN'} &middot;{' '}
                                    {new Date(report.createdAt).toLocaleDateString()}
                                </span>
                                <span className="class-badge class-unclassified">PENDING</span>
                            </li>
                        ))}
                    </ul>
                )}
            </aside>

            <main className="queue-detail">
                {!selected ? (
                    <p className="empty-state">Queue clear. No pending reports.</p>
                ) : (
                    <>
                        <p className="page-code">
                            F/{pad(pending.indexOf(selected) + 1)} &mdash; UNVERIFIED SUBMISSION
                        </p>
                        <h3 className="queue-title">{selected.title}</h3>
                        <p className="queue-meta">
                            SUBMITTED BY {(selected.submittedBy?.username ?? 'UNKNOWN').toUpperCase()} //{' '}
                            {new Date(selected.createdAt).toLocaleDateString()} // [PENDING REVIEW]
                        </p>

                        <p className="detail-description" style={{ margin: '16px 0 22px' }}>
                            {selected.description}
                        </p>

                        {error && <p className="form-error">{error}</p>}

                        <p className="rail-label">CLASSIFICATION</p>
                        <div className="queue-fields">
                            <label className="form-field">
                                <span>Item number</span>
                                <input
                                    placeholder="SCP-5001"
                                    value={draft.itemNumber || ''}
                                    onChange={(e) => updateDraft(selected._id, 'itemNumber', e.target.value)}
                                />
                            </label>
                            <label className="form-field">
                                <span>Object class</span>
                                <select
                                    value={draft.objectClass || ''}
                                    onChange={(e) => updateDraft(selected._id, 'objectClass', e.target.value)}
                                >
                                    <option value="">—</option>
                                    {OBJECT_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </label>
                            <label className="form-field">
                                <span>Series</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={draft.series || ''}
                                    onChange={(e) => updateDraft(selected._id, 'series', e.target.value)}
                                />
                            </label>
                        </div>

                        <label className="form-field">
                            <span>Containment procedures</span>
                            <textarea
                                rows={4}
                                value={draft.containmentProcedures || ''}
                                onChange={(e) => updateDraft(selected._id, 'containmentProcedures', e.target.value)}
                            />
                        </label>

                        <div style={{ display: 'flex', gap: 9, marginTop: 6 }}>
                            <button className="btn" disabled={busyId === selected._id} onClick={() => handleVerify(selected._id)}>
                                {busyId === selected._id ? 'PROCESSING...' : '[VERIFY]'}
                            </button>
                            <button className="btn btn-danger" disabled={busyId === selected._id} onClick={() => handleReject(selected._id)}>
                                [REJECT]
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
