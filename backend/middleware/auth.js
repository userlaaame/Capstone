//for token verification and role gating
//401 = i don't know who you are
//403 = i know you but you can't
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { LOCKED_OUT_STATUSES } from '../config/constants.js';

//this should attach req.user when a valid token is present, if not then throws 401
export const protect = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    //only the verify call belongs in here a DB failure below is a 500, not a 401
    let payload;
    try {
        const token = header.split(' ')[1];
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        //jwt.verify throws on expired or tampered token
        return res.status(401).json({ error: 'Invalid or expired credentials' });
    }

    //Re-fetch the user over trusting token content since role or status could have changed
    const user = await User.findById(payload.id);
    if (!user) {
        return res.status(401).json({ error: 'Account no longer exists' });
    }
    //the re-fetch is pointless unless status is actually enforced
    if (LOCKED_OUT_STATUSES.includes(user.status)) {
        return res.status(403).json({ error: `Account is flagged ${user.status} - access revoked` });
    }

    req.user = user;    //downstream routes read this
    next();
};

//this relies on req.user existing
export const requireOverseer = (req, res, next) => {
    if (req.user?.role !== 'overseer') {
        return res.status(403).json({ error: 'Insufficient clearance for this operation' });
    }
    next();
};
