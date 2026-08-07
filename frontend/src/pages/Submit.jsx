import { useState } from 'react';
//both are needed: Navigate (component) for the guard below, useNavigate (hook)
//for the redirect after a successful submit
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useAnomalies } from '../context/AnomalyContext.jsx';
import { request } from '../api/client.js';

export default function Submit() {
    const { user, token } = useAuth();
    const { loadScps } = useAnomalies();
    const navigate = useNavigate();

    const [form, setForm] = useState({ title: '', description: '', imageUrl: '', lat: '', lng: '' });
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    //this is a route guard, so the unworthy can browse but can't submit
    if (!user) return <Navigate to="/login" replace />;

    //one handler for every field, e.target.name picks the key
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

            //inputs are always strings, Number() them, and GeoJSON has to have [longitude, latitude] IN THAT ORDER
            if (form.lat && form.lng) {
                body.lastSeenLocation = {
                    type: 'Point',
                    //form.lat, not (form, lat) - a comma there is an argument
                    //separator, so Number() would read only `form` and give NaN
                    coordinates: [Number(form.lng), Number(form.lat)],
                };
            }

            await request('/scps', { method: 'POST', body, token });
            await loadScps(); //refresh so the dashboards relects the new submission
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <div className="page">
            <h2>Submit potential anomaly</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                Submissions enter the review queue as unverified. An overseer assigns
                the item number and object class on verification.
            </p>

            <form onSubmit={handleSubmit}>
                <label className="form-field">
                    <span>Title</span>
                    <input name="title" value={form.title} onChange={update} required />
                </label>

                <label className="form-field">
                    <span>Description</span>
                    <textarea name="description" rows={5} value={form.description} onChange={update} required />
                </label>

                <label className="form-field">
                    <span>Image URL (https only, optional)</span>
                    <input name="imageUrl" value={form.imageUrl} onChange={update} placeholder="https://..." />
                </label>

                <div style={{ display: 'flex', gap: 12 }}>
                    <label className="form-field" style={{ flex: 1 }}>
                        <span>Latitude</span>
                        <input name="lat" type="number" step="any" value={form.lat} onChange={update} placeholder="41.76" />
                    </label>
                    <label className="form-field" style={{ flex: 1 }}>
                        <span>Longitude</span>
                        <input name="lng" type="number" step="any" value={form.lng} onChange={update} placeholder="-72.68" />
                    </label>
                </div>

                {error && <p className="form-error">{error}</p>}

                <button className="btn" type="submit" disabled={busy}>
                    {busy ? 'Transmitting...' : 'Submit report'}
                </button>
            </form>
        </div>
    );
}