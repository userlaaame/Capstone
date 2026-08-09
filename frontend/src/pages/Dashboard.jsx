import { useAnomalies } from '../context/AnomalyContext.jsx';
import AnomalyMap from '../components/AnomalyMap.jsx';

export default function Dashboard() {
    //AnomalyContext spreads its state flat and exposes named actions, matching
    //useAuth(). visibleScps and selected are derived in the provider so every
    //page filters identically instead of each one rolling its own.
    const {
        scps, status, error, searchText, classFilter, selectedId,
        visibleScps, selected, setSearch, setClassFilter, selectScp,
    } = useAnomalies();

    //this is derived from the data, not hardcoded
    const classes = ['All', ...new Set(scps.map((s) => s.objectClass).filter(Boolean))];

    //'idle' is the gap between mount and the provider's first fetch. Without it
    //the empty list flashes "No anomalies match current parameters" for a frame.
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
                    <p className="empty-state">No anomalies match current parameters.</p>
                ) : (
                    <ul className="anomaly-list">
                        {/* TODO a11y - these rows are click-only. A bare <li> is not
                            focusable and has no implicit role, so it cannot be reached
                            by Tab and Enter/Space do nothing. Selecting a row is the ONLY
                            way to drive the detail card and to move AnomalyMap, so with a
                            keyboard or a screen reader the dashboard is unusable past the
                            search box and filter chips.

                            Fix is to make the row a real button rather than bolt handlers
                            onto the <li>, so focus, Enter/Space and the announced role all
                            come for free:

                              <li key={scp._id} className="anomaly-row-item">
                                <button
                                  type="button"
                                  className={selectedId === scp._id ? 'anomaly-row selected' : 'anomaly-row'}
                                  aria-current={selectedId === scp._id}
                                  onClick={() => selectScp(scp._id)}
                                >...</button>
                              </li>

                            That needs a CSS pass too .anomaly-row would move onto the
                            button and need width:100%, text-align:left and background:none
                            to keep the current look. Pairs with the .anomaly-map rule. */}
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
                            </li>
                        ))}
                    </ul>
                )}
            </aside>

            <main className="content">
                <AnomalyMap />
                {!selected ? (
                    <p className="detail-empty">Select an anomaly to view its file.</p>
                ) : (
                    <article className="detail-card">
                        <header className="detail-header">
                            <h2>{selected.itemNumber || 'UNCLASSIFIED'}</h2>
                            {selected.objectClass && (
                                <span className={`class-badge class-${selected.objectClass.toLowerCase()}`}>
                                    {selected.objectClass}
                                </span>
                            )}
                        </header>
                        <p className="detail-title">{selected.title}</p>

                        {selected.imageUrl ? (
                            <img className="detail-image" src={selected.imageUrl} alt={selected.title} />
                        ) : (
                            <div className="detail-image placeholder">[data expunged]</div>
                        )}

                        <dl className="detail-stats">
                            <dt>Series</dt><dd>{selected.series ?? '—'}</dd>
                            <dt>Encounters</dt><dd>{selected.encounterCount}</dd>
                            <dt>Last seen</dt>
                            <dd>
                                {selected.lastSeenLocation?.coordinates
                                        // flipped GeoJSON's lng, lat into human readable lat-then-lng
                                    ? `${selected.lastSeenLocation.coordinates[1].toFixed(2)}, ${selected.lastSeenLocation.coordinates[0].toFixed(2)}`
                                    : 'Unknown'}
                            </dd>
                        </dl>

                        {selected.recommendedApproaches?.length > 0 && (
                            <>
                                <h3 className="detail-subhead">Recommended approaches</h3>
                                <ul className="approach-list">
                                    {selected.recommendedApproaches.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                            </>
                        )}

                        <p className="detail-description">{selected.description}</p>
                    </article>
                )}
            </main>
        </div>
    );
}