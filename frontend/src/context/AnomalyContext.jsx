import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef } from "react";
import { request } from "../api/client";

const AnomalyContext = createContext(null);

const initialState = {
    scps: [],
    status: 'idle', //'loading' | 'succeeded' | 'failed'
    error: null,
    //status code that came with the error. 0 means the server was never reached
    //(see api/client.js), which is worth a retry button rather than a dead end.
    errorStatus: null,
    selectedId: null,
    searchText: '',
    classFilter: 'All',
};

function anomalyReducer(state, action) {
    switch (action.type) {
        case 'fetch_started': return { ...state, status: 'loading', error: null, errorStatus: null };
        case 'fetch_succeeded': return { ...state, status: 'succeeded', scps: action.payload };
        case 'fetch_failed': return { ...state, status: 'failed', error: action.payload.message, errorStatus: action.payload.status };
        case 'select_scp': return { ...state, selectedId: action.payload };
        case 'search_changed': return { ...state, searchText: action.payload };
        case 'filter_changed': return { ...state, classFilter: action.payload };
        default: return state;
    }
}

export function AnomalyProvider({ children }) {
    const [state, dispatch] = useReducer(anomalyReducer, initialState);

    //Guards against a stale response overwriting a newer one. loadScps exists so
    //pages can refetch after a submission, and that is exactly the case that
    //breaks without this: if the first call is slow and the second returns first,
    //the slow one lands last and the user sees pre-submission data. Each call
    //claims an id; only the newest is allowed to dispatch.
    const requestId = useRef(0);

    const loadScps = useCallback(async () => {
        const id = ++requestId.current;
        dispatch({ type: 'fetch_started' });
        try {
            const scps = await request('/scps');
            if (id !== requestId.current) return; //superseded, drop it
            dispatch({ type: 'fetch_succeeded', payload: scps });
        } catch (err) {
            if (id !== requestId.current) return;
            dispatch({ type: 'fetch_failed', payload: { message: err.message, status: err.status } });
        }
    }, []);

    useEffect(() => { loadScps(); }, [loadScps]);

    //Named actions instead of handing out raw dispatch. The reducer ends in
    //`default: return state`, so a mistyped action string from a component would
    //silently do nothing - no error, no state change. Keeping the strings in this
    //file makes that impossible, and matches how AuthContext exposes login/logout.
    const selectScp = useCallback((id) => dispatch({ type: 'select_scp', payload: id }), []);
    const setSearch = useCallback((text) => dispatch({ type: 'search_changed', payload: text }), []);
    const setClassFilter = useCallback((cls) => dispatch({ type: 'filter_changed', payload: cls }), []);

    //Derived here rather than in each consumer. searchText/classFilter/selectedId
    //were being stored but nothing read them, so every page would have had to
    //reimplement this filtering - and they would drift apart.
    const visibleScps = useMemo(() => {
        const needle = state.searchText.trim().toLowerCase();
        return state.scps.filter((s) => {
            if (state.classFilter !== 'All' && s.objectClass !== state.classFilter) return false;
            if (!needle) return true;
            //itemNumber is absent until an overseer verifies a record, so fall
            //back to '' rather than searching the string "undefined"
            return `${s.title ?? ''} ${s.itemNumber ?? ''}`.toLowerCase().includes(needle);
        });
    }, [state.scps, state.classFilter, state.searchText]);

    const selected = useMemo(
        () => state.scps.find((s) => s._id === state.selectedId) ?? null,
        [state.scps, state.selectedId]
    );

    //useMemo so this object keeps its identity between renders. Without it every
    //useAnomalies() consumer re-rendered on any change anywhere in the tree, and
    //any effect listing loadScps in its deps re-ran forever chasing a new identity.
    //State is spread flat to match useAuth() - one convention across both contexts,
    //so consumers never have to remember which one nests its state under `state`.
    const value = useMemo(() => ({
        ...state,
        visibleScps,
        selected,
        loadScps,
        selectScp,
        setSearch,
        setClassFilter,
    }), [state, visibleScps, selected, loadScps, selectScp, setSearch, setClassFilter]);

    return (
        <AnomalyContext.Provider value={value}>
            {children}
        </AnomalyContext.Provider>
    );
}

//The context defaults to null, so a component rendered outside the provider would
//fail as "Cannot destructure property 'scps' of null" - which blames the consumer
//instead of the missing provider. Name the actual mistake.
export const useAnomalies = () => {
    const ctx = useContext(AnomalyContext);
    if (!ctx) throw new Error('useAnomalies must be used inside <AnomalyProvider>');
    return ctx;
};
