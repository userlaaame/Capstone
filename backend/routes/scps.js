import express from 'express';
import { protect, requireOverseer } from '../middleware/auth.js';
import {
    getScps, getPending, getScpById, createScp, verifyScp, rejectScp,
    deleteScp, logSighting, getSightings,
} from '../controllers/scpController.js';

const router = express.Router();

//pending/:id or "pending" gets casted as an ObjectId
router.get('/pending', protect, requireOverseer, getPending);
router.get('/', getScps);
router.get('/:id', getScpById);
router.get('/:id/sightings', getSightings);

router.post('/', protect, createScp);
router.post('/:id/sightings', protect, logSighting);

router.patch('/:id/verify', protect, requireOverseer, verifyScp);
router.patch('/:id/reject', protect, requireOverseer, rejectScp);
router.delete('/:id', protect, requireOverseer, deleteScp);

export default router;