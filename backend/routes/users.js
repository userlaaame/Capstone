import express from 'express';
import User from '../models/User.js';
import { rankForPoints } from '../config/constants.js';

const router = express.Router();

// GET /users - The public roster, rank is computed at read time and never stored
//
// TODO - decide what this endpoint should actually expose. It is unauthenticated,
// and toJSON() only strips passwordHash and __v, so everything else on the
// document ships as-is. Worth a second look:
//
//   role      - publishes exactly which account is the 'overseer'. That is the
//               single most valuable account to attack, and /auth/login has no
//               rate limiting yet, so this hands an attacker their target.
//   isSeeded  - advertises which accounts are fake mock personnel.
//
// Neither is needed to render a roster. If they stay, that should be a decision
// rather than a default. Picking fields explicitly instead of spreading toJSON()
// would also stop any field added to the schema later from leaking automatically:
//   users.map(({ _id, username, points, status }) => ({ ... }))
//
// Also unresolved: no pagination (returns every user), and no tiebreaker on the
// sort, so users on equal points come back in an order that can shift per request.
router.get('/', async (req, res) => {
    const users = await User.find().sort({ points: -1 });
    res.json(users.map((u) => ({ 
        _id: u._id,
        username: u.username,
        points: u.points,
        status: u.status,
        avatarUrl: u.avatarUrl,
        rank: rankForPoints(u.points),
     })));//hopefully this fixes it
    //u.toJSON() runs the transform (hash stripped), then rank is bolted on
    //the computed-not-stored, live in an API response.
});

export default router;