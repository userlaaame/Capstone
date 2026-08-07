const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

//token attached here so components never handle the headers
export async function request(path, { method = 'GET', body, token } = {}) {
    let res;
    try {
        res = await fetch(`${BASE}${path}`, {
            method,
            headers: {
                ...(body && { 'Content-Type': 'application/json' }),
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            ...(body && { body: JSON.stringify(body) }),
        });
    } catch {
        //fetch only rejects on network failure, and the raw message is
        //"Failed to fetch" which tells a user nothing. status 0 is the signal
        //to callers that the server was never reached - AuthContext relies on
        //this to avoid throwing away a valid token when the API is just asleep.
        const offline = new Error('Cannot reach the server. It may be starting up - try again in a moment.');
        offline.status = 0;
        throw offline;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        //carry the status through. Without it every failure is just a string and
        //callers cannot tell 401 (token is dead, log out) from 403 (logged in but
        //not allowed) from 500 (our fault, keep the session).
        const err = new Error(data.error || `Request failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}
