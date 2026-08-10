import { useState } from 'react';
import { useAnomalies } from '../context/AnomalyContext.jsx';
import AnomalyMap from '../components/AnomalyMap.jsx';

//BLACKSITE: object-class hues, data only. Matches CLASS_COLORS in AnomalyMap.jsx
//and the --safe/--euclid/... tokens in index.css.
const CLASS_HUES = {
    Safe: 'var(--safe)',
    Euclid: 'var(--euclid)',
    Keter: 'var(--keter)',
    Thaumiel: 'var(--thaumiel)',
    Neutralized: 'var(--neutralized)',
};
const UNCLASSIFIED = 'var(--unclassified)';

const pad = (n) => String(n).padStart(2, '0');

export default function Dashboard() {
    const {
        scps, status, error, searchText, classFilter, selectedId,
        visibleScps, selected, setSearch, setClassFilter, selectScp,
    } = useAnomalies();

    //stage overlays. Toolbar labels name the EFFECT, not the control.
    const [scan, setScan] = useState(true);
    const [grid, setGrid] = useState(false);
    const [thermal, setThermal] = useState(false);

    const classes = ['All', ...new Set(scps.map((s) => s.objectClass).filter(Boolean))];

    //legend counts, derived from the same list the map plots
    const legend = [...Object.keys(CLASS_HUES), 'Unclassified'].map((c) => ({
        label: c.toUpperCase(),
        hue: CLASS_HUES[c] ?? UNCLASSIFIED,
        count: scps.filter((s) => (s.objectClass ?? 'Unclassified') === c).length,
    }));

    const located = visibleScps.filter((s) => s.lastSeenLocation?.coordinates?.length === 2);
    const coords = selected?.lastSeenLocation?.coordinates;
    const lastSeen = coords ? `${coords[1].toFixed(2)}, ${coords[0].toFixed(2)}` : 'UNKNOWN';

    if (status === 'idle' || status === 'loading') {
        return <p className="status-message">Establishing secure connection...</p>
    }
    if (status === 'failed') {
        return <p className="status-message">Connection failed: {error}</p>
    }

    return (
        <div className="app-body">
            <aside className="sidebar">
                <input
                    className="search-bar"
                    placeholder="Search anomalies"
                    value={searchText}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="class-filter">
                    {classes.map((c) => (
                        <button
                            key={c}
                            className={classFilter === c ? 'chip chip-active' : 'chip'}
                            onClick={() => setClassFilter(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {visibleScps.length === 0 ? (
                    <p className="empty-state">No records match current parameters.</p>
                ) : (
                    <ul className="anomaly-list">
                        {visibleScps.map((scp) => (
                            <li
                                key={scp._id}
                                className={selectedId === scp._id ? 'anomaly-row selected' : 'anomaly-row'}
                                onClick={() => selectScp(scp._id)}
                            >
                                <span className="row-number">{scp.itemNumber || 'UNCLASSIFIED'}</span>
                                <span className="row-meta">
                                    {scp.title} &middot; {scp.encounterCount} encounters
                                </span>
                                {/* BLACKSITE: the object-class rating rides the row, so the
                                    index reads as a rating list rather than a title list. */}
                                <span className={`class-badge class-${(scp.objectClass || 'unclassified').toLowerCase()}`}>
                                    {scp.objectClass || 'PENDING'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </aside>

            <main className="content">
                {/* the map is an instrument in the right rail, not a banner above the file */}
                <div className="map-rail">
                    <div className="map-stage">
                        <AnomalyMap />
                        {scan && <span className="stage-scan" />}
                        {grid && <span className="stage-grid" />}
                        {thermal && <span className="stage-thermal" />}
                        <span className="stage-tag">
                            SCAN 01/03 &mdash; GLOBAL PLOT // {pad(located.length)} FIXES
                        </span>
                    </div>

                    <div className="stage-toolbar">
                        <button className={scan ? 'toolbar-btn active' : 'toolbar-btn'} onClick={() => setScan(!scan)}>SCAN LINES</button>
                        <button className={grid ? 'toolbar-btn active' : 'toolbar-btn'} onClick={() => setGrid(!grid)}>GRID OVERLAY</button>
                        <button className={thermal ? 'toolbar-btn active' : 'toolbar-btn'} onClick={() => setThermal(!thermal)}>THERMAL</button>
                    </div>

                    {selected && (
                        <div className="rail-panel">
                            <p className="rail-label">RECORD STATUS</p>
                            <dl className="status-list">
                                <dt>CLASS</dt>
                                <dd className={selected.objectClass === 'Keter' ? 'hot' : undefined}>
                                    {(selected.objectClass || 'UNCLASSIFIED').toUpperCase()}
                                </dd>
                                <dt>STATUS</dt>
                                <dd className={selected.status === 'pending' ? 'hot' : undefined}>
                                    {(selected.status || 'CONTAINED').toUpperCase()}
                                </dd>
                                <dt>SERIES</dt><dd>{selected.series ?? '—'}</dd>
                                <dt>ENCOUNTERS</dt><dd>{selected.encounterCount}</dd>
                                <dt>LAST SEEN</dt><dd>{lastSeen}</dd>
                            </dl>
                        </div>
                    )}

                    <div className="rail-panel">
                        <p className="rail-label">PLOT LEGEND</p>
                        <div className="plot-legend">
                            {legend.map((l) => (
                                <div className="legend-row" key={l.label}>
                                    <span className="legend-dot" style={{ background: l.hue }} />
                                    <span>{l.label}</span>
                                    <span className="legend-count">{pad(l.count)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {!selected ? (
                    <p className="detail-empty">Select a record to open its file.</p>
                ) : (
                    <article className="detail-card">
                        {/* instrument tag: always n/total */}
                        <p className="detail-code">
                            ITEM {pad(scps.indexOf(selected) + 1)}/{pad(scps.length)} &mdash; SUBJECT: {selected.itemNumber || 'UNCLASSIFIED'}
                        </p>
                        <header className="detail-header">
                            <h2>{selected.itemNumber || 'UNCLASSIFIED'}</h2>
                            {selected.objectClass && (
                                <span className={`class-badge class-${selected.objectClass.toLowerCase()}`}>
                                    {selected.objectClass}
                                </span>
                            )}
                        </header>
                        <p className="detail-title">{selected.title}</p>

                        {/* property band: object-class hue on the badge only, the rest
                            of the record's properties as chips in the grey ladder. Every
                            chip is a real field nothing here is decorative. */}
                        <div className="detail-chips">
                            <span className={`class-badge class-${(selected.objectClass || 'unclassified').toLowerCase()}`}>
                                {selected.objectClass || 'UNCLASSIFIED'}
                            </span>
                            <span className="chip-spacer" />
                            {selected.series != null && <span className="chip-static">SERIES {selected.series}</span>}
                            <span className="chip-static">{selected.encounterCount} ENCOUNTERS</span>
                            <span className="chip-static">{coords ? 'LOCATED' : 'POSITION UNKNOWN'}</span>
                            {selected.status === 'pending' && <span className="chip-static hot">UNVERIFIED</span>}
                        </div>

                        {selected.imageUrl ? (
                            <img className="detail-image" src={selected.imageUrl} alt={selected.title} />
                        ) : (
                            <div className="detail-image placeholder">[data expunged]</div>
                        )}

                        <dl className="detail-stats">
                            <dt>Series</dt><dd>{selected.series ?? '—'}</dd>
                            <dt>Encounters</dt><dd>{selected.encounterCount}</dd>
                            <dt>Last seen</dt><dd>{lastSeen}</dd>
                        </dl>

                        {selected.recommendedApproaches?.length > 0 && (
                            <>
                                <h3 className="detail-subhead">Recommended approaches</h3>
                                <ul className="approach-list">
                                    {selected.recommendedApproaches.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                            </>
                        )}

                        <h3 className="detail-subhead">Special containment procedures</h3>
                        <p className="detail-description">{selected.description}</p>

                        <p className="detail-footer">
                            ENCOUNTERS: {selected.encounterCount} // LAST SEEN: {lastSeen} // SERIES: {selected.series ?? '—'}
                        </p>
                    </article>
                )}
            </main>
        </div>
    );
}
