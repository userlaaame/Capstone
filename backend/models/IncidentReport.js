import mongoose from 'mongoose';

const incidentReportSchema = new mongoose.Schema({
    scp: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scp', //ref needs to match the model with the name string from mongoose.model
        required: true,
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    severity: {
        type: String,
        required: true,
        enum: ['Minor', 'Moderate', 'Severe', 'Containment Breach'],
    },
    summary: {
        type: String,
        required: true,
        trim: true,
        maxLength: [500, 'Summary must be 500 characters or fewer'],
    },
    occurredAt: {
        type: Date,
        default: Date.now, // Date.now would freeze one timestamp at server start.
                            //Passing the function reference means Mongoose invokes 
                            //it per-document; passing the call would evaluate once 
                            // at module load and stamp every incident with my 
                            // server's boot time
        validate: {
            validator: (v) => v <= new Date(),
            message: 'occurredAt cannot be in the future...unless!'
        }
    },
    casualties: {
        type: Number,
        default: 0,
        min: [0, 'Casualties cannot be negative'],
    },
},
    { timestamps: true }
);

// THE query for this collection: "all incidents for SCP-XXXX, newest first."
// The compound index is pre-sorted, so no in-memory sort is ever needed.
incidentReportSchema.index({ scp: 1, occurredAt: -1 });

export default mongoose.model('IncidentReport', incidentReportSchema);