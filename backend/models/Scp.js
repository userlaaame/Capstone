import mongoose from 'mongoose';

//Its own sub-schema so the parent can default to undefined. Declared inline, a
//default on the nested 'type' path makes Mongoose build { type: 'Point' } with no
//coordinates on EVERY document which the 2dsphere index rejects at insert with
//"Can't extract geo keys" (error 16755). _id:false keeps it a plain embedded object.
const pointSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],     // it loooks like GeoJSON order should go from longitude -> latitude
            required: true,
            //LIMITATION - a lat/lng swap cannot be caught here. [41.76, -72.68] is
            //Connecticut written backwards, but it is also a perfectly valid point
            //off the coast of Somalia, so it passes every check below. Verified
            //against Atlas: it inserts clean and $near will happily return it.
            //Anything with |lat| <= 90 has an in-range mirror image, so the only
            //real defence is the submission form labelling the two fields clearly
            //and sending them in GeoJSON order; longitude FIRST, which is the
            //reverse of how people say coordinates out loud.
            validate: {
                validator: (v) =>
                    v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
                message: 'coordinates must be [longitude, latitude] within valid ranges',
            },
        },
    },
    { _id: false }
);

const scpSchema = new mongoose.Schema(
    {
        //=== identity: assigned at verification ===
        itemNumber: {
            type: String,
            match: [/^SCP-\d{3,4}$/, 'Format must be SCP-### or SCP-####'],
            //submissions without this field skip the unique index completley
            index: { unique: true, sparse: true },
        },
        title: {
            type: String,
            required: [true, 'Every report needs a title'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Every report needs a description'],
        },

        //=== SCP-only field: optional at schema, enforced complete by verfied
        //     controller before status flip ===
        objectClass: {
            type: String,
            enum: {
                values: ['Safe', 'Euclid', 'Keter', 'Thaumiel', 'Neutralized'],
                message: '{VALUE} is not a recognized object class',
            },
        },
        series: { type: Number, min: 1 },
        containmentProcedures: { type: String },
        recommendedApproaches: {
            type: [String], //should render an array checklist in the UI
            default: [],
        },

        // === workflow ===
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending',
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',    //if it's a wiki-seeded SCP then null
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        //=== geo + media (ported from my 319 sba extension) ===
        //default:undefined is load-bearing; it keeps the field off the document
        //entirely when unset, and a 2dsphere index skips documents missing the field
        lastSeenLocation: { type: pointSchema, default: undefined },
        imageUrl: {
            type: String,
            match: [/^https:\/\/.+/, 'Image URL must be https'],
        },
        // Every logged sighting increments
        encounterCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

// Filtered field in the app: map wants verified, review queue gets pending
scpSchema.index({ status: 1 });
// Class filtering on the dashboard, same as the SBAs
scpSchema.index({ objectClass: 1 });
// Geospatial queries - a proximity feature....i hope
scpSchema.index({ lastSeenLocation: '2dsphere' });

export default mongoose.model('Scp', scpSchema);