import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const SALT_ROUNDS = 10; //salt_rounds is pretty dope
const TOKEN_EXPIRY = '7d';
const MAX_PASSWORD_BYTES = 72; //bcrypt reads no further, anything past this is silently ignored

//Compared against when no user matches, so a failed login costs the same either
//way. Without it the early return is ~50x faster and leaks which usernames exist.
const DUMMY_HASH = bcrypt.hashSync('placeholder-that-never-matches', SALT_ROUNDS);

//This place is made for building tokens, so register and login never drift apart
const signToken = (user) =>
    jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

// POST /auth/register
export const register = async (req, res) => {
    const { username, password } = req.body;

    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    //reject rather than quietly truncate to bcrypt's limit
    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
        return res.status(400).json({ error: `Password must be ${MAX_PASSWORD_BYTES} bytes or fewer` });
    }

    //role isn't read from req.body, that way no one can register as an overseer
    const user = await User.create({
        username,
        passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
    });

    // toJSON should strip passwordHash automatically
    res.status(201).json({ token: signToken(user), user });
};

// POST /auth/login
export const login = async (req, res) => {
    const { username, password } = req.body;

    //bcrypt.compare throws on an undefined password, which would surface as a 500
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    //trim as well as lowercase, the schema normalizes both on the way in
    const user = await User.findOne({ username: username.trim().toLowerCase() })
        .select('+passwordHash');

    //always run the compare, even with no match, so the response time is identical
    //either way. That is what actually conceals which usernames exist; the shared
    //401 alone does not.
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    //this should stop constant request; after password checks so accounts stay hidden
    if (user.status !== 'Active') {
        return res.status(403).json({ error: `Account is flagged ${user.status} - access revoked` });
    }
    res.json({ token: signToken(user), user });
};

// GET /auth/me --- hopefully this lets the frontend restore sessions from stored tokens
export const getMe = async (req, res) => {
    res.json(req.user);
};