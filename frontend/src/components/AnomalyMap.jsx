import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { useAnomalies } from '../context/AnomalyContext';

//this matches the badge colors in index.css so the map reads the same
const CLASS_COLORS = {
    Safe: '#6fae7a',
    Euclid: '#d9a441',
    Keter: '#c85a4a',
    Thaumiel: '#7fa8c9',
    Neutralized: '#8b968a',
};
const UNCLASSIFIED = '#5c665b'; //pending reports have no objectClass yet

//this render's nothing it' exists purely to fly the map to whatever the sidebar selected
function MapFocus({ selected }) {
    const map = useMap();

    useEffect(() => {
        const coords = selected?.lastSeenLocation?.coordinates;
        if (!coords || coords.length !== 2) return;
        const [lng, lat] = coords;  //GeoJSON order out of Mongo
        //flyTo, capital T. Leaflet only defines flyTo and flyToBounds, so the
        //lowercase spelling is undefined and throws the moment anything is selected
        map.flyTo([lat, lng], 6, { duration: 1.2 }); //Leaflet wants [lat,lng]...also its "flyTo"
    }, [selected, map]);

    return null;
}

export default function AnomalyMap() {
    const { visibleScps, selectedId, selectScp } = useAnomalies();

    //this should skip anything without usable coordinates instead of crashing on undefined
    const located = visibleScps.filter(
        (scp) => scp.lastSeenLocation?.coordinates?.length === 2
    );

    return (
        //TODO - .anomaly-map has no rule in index.css yet. Leaflet has no intrinsic
        //size: it measures this element and draws into it, so with no height the
        //container collapses to 0px and the map is invisible with no console error.
        //Nothing here works until that rule exists.
        <MapContainer center={[25, 0]} zoom={2} className="anomaly-map" worldCopyJump>
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {located.map((scp) => {
                const [lng, lat] = scp.lastSeenLocation.coordinates;
                const isSelected = scp._id === selectedId;
                const color = CLASS_COLORS[scp.objectClass] ?? UNCLASSIFIED;

                return (
                    <CircleMarker //Leaflet's default pin icon references image files 
                        //by relative path, then vite rewrites them...let's sidestep this bug
                        key={scp._id}
                        center={[lat, lng]}//...this gets confusing
                        radius={isSelected ? 11 : 6}
                        pathOptions={{
                            color,
                            fillColor: color,
                            fillOpacity: isSelected ? 0.9 : 0.55,
                            weight: isSelected ? 3 : 1,
                            //dashed ring should mark unverified submissions on the map
                            dashArray: scp.status === 'pending' ? '3 3' : undefined,
                        }}
                        eventHandlers={{ click: () => selectScp(scp._id) }}
                    >
                        <Popup>
                            <strong>{scp.itemNumber || 'UNCLASSIFIED'}</strong>
                            <br />
                            {scp.title}
                        </Popup>
                    </CircleMarker>
                );
            })}

            <MapFocus selected={visibleScps.find((s) => s._id === selectedId) ?? null} />
        </MapContainer>
    );
}
