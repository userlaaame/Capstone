import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router";
import { useAuth } from '../context/AuthContext.jsx';
import { useAnomalies } from '../context/AnomalyContext.jsx';
import { request } from "../api/client.js";

const OBJECT_CLASSES = ['Safe', 'Euclid', 'Keter', 'Thaumiel', 'Neutralized'];

export default function Command() {
    const { user, isOverseer, token } = useAuth();
    const { loadScps } = useAnomalies();

    const [pending, setPending] = useState([]);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    //verfication fields, keyed by report id so each row keeps its own draft
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

    //route guard
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
            await Promise.all([loadPending(), loadScps()]); //queue and dashboard both change
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
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    }

    if (status === 'loading') return <p className="status-message">Loading review queue...</p>
    if (status === 'failed') return <p className="status-message">Failed: {error}</p>

    return (
        <div className="page" style={{ maxWidth: 900 }}>
            <h2>Review queue</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                {pending.length} report{pending.length === 1 ? '' : 's'} awaiting classification.
                Verification assigns an item number and awards the submitter 50 points.
            </p>

            {error && <p className="form-error">{error}</p>}

            {pending.length === 0 ? (
                <p className="empty-state">Queue clear. No pending reports.</p>
            ) : (
                pending.map((report) => {
                    const draft = drafts[report._id] || {};
                    return (
                        <article key={report._id} className="detail-card" style={{ maxWidth: 'none', marginBottom: 16 }}>
                            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 500 }}>{report.title}</h3>
                            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 10px' }}>
                                Submitted by {report.submittedBy?.username ?? 'unknown'} &middot;{' '}
                                {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                            <p className="detail-description">{report.description}</p>

                            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                                <label className="form-field" style={{ flex: 1 }}>
                                    <span>Item number</span>
                                    <input
                                        placeholder="SCP-5001"
                                        value={draft.itemNumber || ''}
                                        onChange={(e) => updateDraft(report._id, 'itemNumber', e.target.value)}
                                    />
                                </label>
                                <label className="form-field" style={{ flex: 1 }}>
                                    <span>Object class</span>
                                    <select
                                        value={draft.objectClass || ''}
                                        onChange={(e) => updateDraft(report._id, 'objectClass', e.target.value)}
                                    >
                                        <option value="">Select...</option>
                                        {OBJECT_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </label>
                                <label className="form-field" style={{ width: 90 }}>
                                    <span>Series</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={draft.series || ''}
                                        onChange={(e) => updateDraft(report._id, 'series', e.target.value)}
                                    />
                                </label>
                            </div>

                            <label className="form-field">
                                <span>Containment procedures</span>
                                <textarea
                                    rows={3}
                                    value={draft.containmentProcedures || ''}
                                    onChange={(e) => updateDraft(report._id, 'containmentProcedures', e.target.value)}
                                />
                            </label>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn" disabled={busyId === report._id} onClick={() => handleVerify(report._id)}>
                                    {busyId === report._id ? 'Processing...' : 'Verify'}
                                </button>
                                <button className="btn btn-secondary" disabled={busyId === report._id} onClick={() => handleReject(report._id)}>
                                    Reject
                                </button>
                            </div>
                        </article>
                    );
                })
            )}
        </div>
    );


}


