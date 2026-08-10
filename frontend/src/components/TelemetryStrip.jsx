import { useState, useEffect } from 'react';
import { useAnomalies } from '../context/AnomalyContext.jsx';

//BLACKSITE telemetry strip. Sits under the nav on every screen.
//LINK is not decoration: it reports the real fetch state from AnomalyContext.
const LINK_STATE = {
    idle: 'HANDSHAKE',
    loading: 'HANDSHAKE',
    succeeded: 'NOMINAL',
    failed: 'SEVERED',
};

function zulu(d) {
    return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
}

export default function TelemetryStrip() {
    const { status } = useAnomalies();
    const [now, setNow] = useState(() => new Date());

    //ticks on the minute boundary rather than every second this is a readout,
    //not a stopwatch, and a per-second interval re-renders the whole shell
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(id);
    }, []);

    const link = LINK_STATE[status] ?? 'HANDSHAKE';

    return (
        <div className="telemetry">
            <span className="tel-site">SITE-19 // {zulu(now)} ZULU</span>
            <span className={link === 'SEVERED' ? 'tel-link-severed' : undefined}>
                LINK &rarr; {link}
            </span>
            {/* CJK accent, at most twice per screen */}
            <span className="tel-cjk">収容</span>
            <span className="tel-spacer" />
            <span className="tel-cjk">BLACKSITE // FIELD COMMAND</span>
        </div>
    );
}
