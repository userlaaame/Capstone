import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnomalies } from '../context/AnomalyContext.jsx';
import { request } from '../api/client.js';

//BLACKSITE: form left, live "as it will be filed" preview right. The preview is
//the same record shell an overseer sees in the queue, so what you type is what
//lands there nothing about the submission is hidden until after review.
export default function Submit() {
    const { user, token } = useAuth();
    const { loadScps } = useAnomalies();
    const navigate = useNavigate();

    const [form, setForm] = useState({ title: '', description: '', imageUrl: '', lat: '', lng: '' });
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    if (!user) return <Navigate to="/login" replace />;

    const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setBusy(true);

        try {
            const body = {
                title: form.title,
                description: form.description,
                ...(form.imageUrl && { imageUrl: form.imageUrl }),
            };

            //inputs are always strings, Number() them, and GeoJSON has to have
            //[longitude, latitude] IN THAT ORDER
            if (form.lat && form.lng) {
                body.lastSeenLocation = {
                    type: 'Point',
                    coordinates: [Number(form.lng), Number(form.lat)],
                };
            }

            await request('/scps', { method: 'POST', body, token });
            await loadScps();
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    const previewCoords = (form.lat && form.lng)
        ? `${Number(form.lat).toFixed(2)}, ${Number(form.lng).toFixed(2)}`
        : 'UNKNOWN';

    return (
        <div className="split">
            <div>
                <p className="page-code">F/01 &mdash; UNVERIFIED SUBMISSION</p>
                <div className="page-head"><h2>FILE REPORT</h2></div>
                <p style={{ fontFamily: 'var(--bs-micro)', fontSize: 9, letterSpacing: 'var(--bs-track-code)', color: 'var(--bs-muted)', lineHeight: 1.9, margin: '0 0 20px' }}>
                    SUBMISSIONS ENTER THE REVIEW QUEUE AS UNVERIFIED. AN OVERSEER
                    ASSIGNS THE ITEM NUMBER AND OBJECT CLASS ON VERIFICATION.
                </p>

                <form onSubmit={handleSubmit}>
                    <label className="form-field">
                        <span>Title</span>
                        <input name="title" value={form.title} onChange={update} placeholder="STAIRWELL ANOMALY — GRID 44-C" required />
                    </label>

                    <label className="form-field">
                        <span>Description</span>
                        <textarea name="description" rows={6} value={form.description} onChange={update} required />
                    </label>

                    <label className="form-field">
                        <span>Image URL <em style={{ fontStyle: 'normal', color: 'var(--bs-muted)', float: 'right' }}>OPTIONAL — HTTPS ONLY</em></span>
                        <input name="imageUrl" value={form.imageUrl} onChange={update} placeholder="https://" />
                    </label>

                    <div className="field-row">
                        <label className="form-field">
                            <span>Latitude</span>
                            <input name="lat" type="number" step="any" value={form.lat} onChange={update} placeholder="41.76" />
                        </label>
                        <label className="form-field">
                            <span>Longitude</span>
                            <input name="lng" type="number" step="any" value={form.lng} onChange={update} placeholder="-72.68" />
                        </label>
                    </div>

                    {error && <p className="form-error">{error}</p>}

                    <button className="btn" type="submit" disabled={busy}>
                        {busy ? 'TRANSMITTING...' : 'TRANSMIT'}
                    </button>
                </form>
            </div>

            <div>
                <p className="rail-label">AS IT WILL BE FILED</p>
                <div className="preview-card">
                    <p className="page-code">Q/02 &mdash; AWAITING CLASSIFICATION</p>
                    <p className="preview-number">[PENDING]</p>
                    <p className="detail-title">
                        {form.title.trim() ? form.title.toUpperCase() : '[UNTITLED SUBMISSION]'}
                    </p>

                    <div className="detail-image placeholder">[data expunged]</div>

                    <p className="detail-description" style={{ marginTop: 16 }}>
                        {form.description.trim() || 'Description not yet entered. The reporting agent’s account appears here exactly as typed and is not edited before review.'}
                    </p>

                    <dl className="status-list" style={{ marginTop: 16 }}>
                        <dt>CLASS</dt><dd>UNCLASSIFIED</dd>
                        <dt>STATUS</dt><dd>PENDING REVIEW</dd>
                        <dt>LAST SEEN</dt><dd>{previewCoords}</dd>
                        <dt>FILED BY</dt><dd>{user.username}</dd>
                    </dl>
                </div>
                <p className="preview-foot">
                    PREVIEW REFLECTS THE FORM ABOVE // ITEM NUMBER AND CLASS ARE
                    ASSIGNED ON VERIFICATION
                </p>
            </div>
        </div>
    );
}
