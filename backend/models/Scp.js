import mongoose from 'mongoose';

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
                values: ['Safe', 'Euclid', 'Keter', 'Thamiel', 'Neutralized'],
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
        lastSeenLocation: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number],     // it loooks like GeoJSON order should go from longitude -> latitude
            },
        },
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