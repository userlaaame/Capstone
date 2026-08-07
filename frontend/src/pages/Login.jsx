import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
    //FIX 3 - `submitting` comes from AuthContext rather than a local `busy`
    //useState. It was already tracking exactly this, and two sources of truth for
    //one flag can drift if a submit is ever triggered from somewhere else.
    const { user, login, register, error, submitting, clearError } = useAuth();

    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    //FIX 2 - `error` is shared context state, so it can already hold a failure
    //from session restore (e.g. "Cannot reach the server") before this form has
    //ever been touched. Showing that immediately reads as "your login failed"
    //when it means "we could not check your existing session". Only surface the
    //message once the user has actually submitted something.
    const [attempted, setAttempted] = useState(false);

    //if you're already signed in, Navigate replaces the history so going back doesn't
    //bounce the user straight back here
    if (user) return <Navigate to="/" replace />;

    async function handleSubmit(e) {
        e.preventDefault(); //ESSENTIAL
        setAttempted(true);
        //no navigate() on success - login() sets `user`, which re-renders this
        //component into the <Navigate replace> above. Calling both just did the
        //same job twice, and navigate() pushes where Navigate replaces.
        await (mode === 'login' ? login(username, password) : register(username, password));
    }

    //FIX 1 - switching modes fires no request, so nothing else clears the error.
    //Without this, failing a sign-in and then clicking Register leaves "Invalid
    //credentials" sitting under the registration form.
    function toggleMode() {
        clearError();
        setAttempted(false);
        setMode(mode === 'login' ? 'register' : 'login');
    }

    return (
        <div className="page">
            <h2>{mode === 'login' ? 'Personnel sign-in' : 'Request clearance'}</h2>

            <form onSubmit={handleSubmit}>
                <label className="form-field">
                    <span>Username</span>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        required
                    />
                </label>

                <label className="form-field">
                    <span>Password{mode === 'register' && ' (minimum 8 characters)'}</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                    />
                </label>

                {attempted && error && <p className="form-error">{error}</p>}

                <button className="btn" type="submit" disabled={submitting}>
                    {submitting ? 'Transmitting...' : mode === 'login' ? 'Sign in' : 'Register'}
                </button>
            </form>

            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
                {mode === 'login' ? 'No credentials on file? ' : 'Already registered? '}
                {/* FIX 4 - type="button" is load-bearing. A <button> with no type
                    defaults to submit; this one only behaves today because it sits
                    outside </form>. Move it inside for layout and it would toggle
                    the mode AND submit the form in one click. */}
                <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={toggleMode}
                >
                    {mode === 'login' ? 'Register' : 'Sign in'}
                </button>
            </p>
        </div>
    );
}
