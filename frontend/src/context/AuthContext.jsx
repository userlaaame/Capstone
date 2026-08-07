import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef } from "react";
import { request } from "../api/client";

const AuthContext = createContext(null);
const TOKEN_KEY = 'fc_token';

const initialState = {
    token: localStorage.getItem(TOKEN_KEY),
    user: null,
    status: 'idle',
    error: null,
    //FIX 2 - forms read this to disable their submit button while a request is
    //in flight. Kept in state (not just the ref below) because the UI has to
    //re-render to show the disabled/spinner state.
    submitting: false,
};

function authReducer(state, action) {
    switch (action.type) {
        //error clears on every new attempt so a stale failure message from an
        //earlier screen never shows up on a fresh form
        case 'restoring': return { ...state, status: 'restoring', error: null };
        case 'submitting': return { ...state, submitting: true, error: null };
        case 'authed': return { ...state, status: 'ready', submitting: false, token: action.payload.token, user: action.payload.user, error: null };
        case 'logout': return { ...state, status: 'ready', submitting: false, token: null, user: null, error: null };
        case 'error': return { ...state, status: 'ready', submitting: false, error: action.payload };
        //the dispatches above only clear the error when something new STARTS. A
        //screen that changes what the user is looking at without firing a request
        //- switching the login form to register, say - needs to clear it too, or
        //the old failure hangs around under the new form.
        case 'clear_error': return { ...state, error: null };
        case 'ready': return { ...state, status: 'ready' };
        default: return state;
    }
}

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    //FIX 2 - the actual double-submit guard. This has to be a ref, not the
    //`submitting` state above: React batches state updates, so two clicks in the
    //same tick would both still see submitting === false and both fire. A ref
    //mutates synchronously, so the second click sees true immediately.
    const inFlight = useRef(false);

    //if a token survives a refresh then restore the session
    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return dispatch({ type: 'ready' });

        async function restore() {
            dispatch({ type: 'restoring' });
            try {
                const user = await request('/auth/me', { token });
                dispatch({ type: 'authed', payload: { token, user } });
            } catch (err) {
                //FIX 1 - only discard the token when the SERVER rejected it.
                //A bare catch here deleted the token on ANY failure, including
                //"fetch failed" - so a cold start on Render (30s+ spin-up) or a
                //dropped wifi connection logged the user out for good even
                //though their token was still perfectly valid.
                if (err.status === 401 || err.status === 403) {
                    localStorage.removeItem(TOKEN_KEY);
                    dispatch({ type: 'logout' });
                } else {
                    //server unreachable or 500 - keep the token, surface why.
                    //state.token stays set with user null, so the app knows the
                    //session is unconfirmed rather than absent.
                    dispatch({ type: 'error', payload: err.message });
                }
            }
        }
        restore();
    }, []);

    //useCallback so the identity is stable - see the useMemo note on `value`
    const submitCredentials = useCallback(async (path, username, password) => {
        //FIX 2 - register is not idempotent. Without this guard a double-click
        //created the account on the first call, then hit the unique index on the
        //second and dispatched a 409, leaving the user logged in while staring
        //at "Duplicate value: {...}".
        if (inFlight.current) return false;
        inFlight.current = true;
        dispatch({ type: 'submitting' });

        try {
            const data = await request(path, { method: 'POST', body: { username, password } });
            localStorage.setItem(TOKEN_KEY, data.token);
            dispatch({ type: 'authed', payload: data });
            return true;
        } catch (err) {
            dispatch({ type: 'error', payload: err.message });
            return false;
        } finally {
            //must be in finally - an early return on the error path would leave
            //the guard stuck true and block every later attempt
            inFlight.current = false;
        }
    }, []);

    const login = useCallback((u, p) => submitCredentials('/auth/login', u, p), [submitCredentials]);
    const register = useCallback((u, p) => submitCredentials('/auth/register', u, p), [submitCredentials]);
    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        dispatch({ type: 'logout' });
    }, []);
    const clearError = useCallback(() => dispatch({ type: 'clear_error' }), []);

    //FIX 3 - without useMemo this object was rebuilt on every render, so every
    //useAuth() consumer re-rendered on any change anywhere, and any effect with
    //[login] or [logout] in its deps re-ran forever chasing new identities.
    const value = useMemo(() => ({
        ...state,
        isOverseer: state.user?.role === 'overseer',
        login,
        register,
        logout,
        clearError,
    }), [state, login, register, logout, clearError]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

//FIX 4 - the context defaults to null, so a component rendered outside the
//provider used to fail as "Cannot destructure property 'user' of null", which
//points at the consumer instead of the real problem. Name the actual mistake.
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
};
