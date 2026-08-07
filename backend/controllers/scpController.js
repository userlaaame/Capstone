import Scp from '../models/Scp.js';
import IncidentReport from '../models/IncidentReport.js';
import User from '../models/User.js';
import { POINTS } from '../config/constants.js';

// GET /scps - public: verfied only, optional ?objectClass = filter
export const getScps = async (req, res) => {
    const filter = { status: 'verified' };
    if (req.query.objectClass) filter.objectClass = req.query.objectClass;
    //sort on the query so MongoDB does it, same as getPending below
    const scps = await Scp.find(filter).sort({ itemNumber: 1 });
    res.json(scps);
};

// GET /scps/pending - this is for Overseer review queue, goes in FIFO order
export const getPending = async (req, res) => {
    const pending = await Scp.find({ status: 'pending' })
        .sort({ createdAt: 1 })
        .populate('submittedBy', 'username');
    res.json(pending);
};

// GET /scps/:id - public record
export const getScpById = async (req, res) => {
    const scp = await Scp.findById(req.params.id)
        .populate('submittedBy', 'username')
        .populate('verifiedBy', 'username');
    if (!scp) return res.status(404).json({ error: 'Record not found' });
    res.json(scp);
};

// POST /scps - authenticated: submit a potential anomaly...still figuring this one out
export const createScp = async (req, res) => {
    //must be impossible to set from the outside
    const { title, description, lastSeenLocation, imageUrl } = req.body;

    const scp = await Scp.create({
        title,
        description,
        lastSeenLocation,
        imageUrl,
        status: 'pending',
        submittedBy: req.user._id,
    });
    //The idea here is whatever points currently is, add POINTS.SUBMISSION to it. $inc is
    //used to avoid lost updates incase multiple submissions happen at once
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: POINTS.SUBMISSION } });

    res.status(201).json(scp);
};

// PATCH /scps/:id/verify - for overseer only: they complete the record, then awards the points
export const verifyScp = async (req, res) => {
    const scp = await Scp.findById(req.params.id);
    if (!scp) return res.status(404).json({ error: 'Record not found' });
    if (scp.status === 'verified') {
        return res.status(409).json({ error: 'Already verified' });
    }

    const { itemNumber, objectClass, containmentProcedures, series, recommendedApproaches } = req.body;

    //"verified means complete" is enforced here
    if (!itemNumber || !objectClass || !containmentProcedures) {
        return res.status(400).json({
            error: 'Verification requires itemNumber, objectClass, and containmentProcedures',
        });
    }

    //apply the completed record, then flip it. Without these assignments save()
    //writes back an unchanged doc, status stays 'pending', and the guard above
    //never fires so the same call could be replayed for points forever.
    scp.itemNumber = itemNumber;
    scp.objectClass = objectClass;
    scp.containmentProcedures = containmentProcedures;
    if (series !== undefined) scp.series = series;
    if (recommendedApproaches !== undefined) scp.recommendedApproaches = recommendedApproaches;

    scp.status = 'verified';
    scp.verifiedBy = req.user._id;

    // save() = full document validation (enum, match) + the sparse unique
    // index fires E11000 -> 409 via errorHandler if the itemNumber is taken
    await scp.save();

    //submitter earns the verification bonus
    if (scp.submittedBy) {
        await User.findByIdAndUpdate(scp.submittedBy, { $inc: { points: POINTS.VERIFIED } });
    }

    res.json(scp);
};

// PATCH /scps/:id/reject - overseer only
export const rejectScp = async (req, res) => {
    const scp = await Scp.findByIdAndUpdate(
        req.params.id,
        { status: 'rejected' },
        { new: true, runValidators: true }
    );
    if (!scp) return res.status(404).json({ error: 'Record not found' });
    res.json(scp);
};

// DELETE /scps/:id - overseer only, to cleanup rejected reports
export const deleteScp = async (req, res) => {
    const scp = await Scp.findByIdAndDelete(req.params.id);
    if (!scp) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: `${scp.title} expunged`, deleted: scp });
};

// POST /scps/:id/sightings - authenticated: logs an encouter
export const logSighting = async (req, res) => {
    const { severity, summary, casualties } = req.body;

    const scp = await Scp.findById(req.params.id);
    if (!scp) return res.status(404).json({ error: 'Record not found' });

    if (scp.status !== 'verified') {
        return res.status(409).json({ error: 'Sightings can only be logged against verified records' });
    }

    const sighting = await IncidentReport.create({
        scp: scp._id,
        reportedBy: req.user._id,
        severity,
        summary,
        casualties,
    });

    await Scp.findByIdAndUpdate(scp._id, { $inc: { encounterCount: 1 } });

    res.status(201).json(sighting);
};

// GET /scps/:id/sightings - public, newest first
export const getSightings = async (req, res) => {
    const sightings = await IncidentReport.find({ scp: req.params.id })
        .sort({ occurredAt: -1 })
        .populate('reportedBy', 'username');
    res.json(sightings);
};