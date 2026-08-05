//hopefully this auths without leaking secrets
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,       // creates a unique index
            trim: true,
            lowercase: true,    // keeps lower and uppercase accounts synonomous
            minLength: [3, 'Username must be at least 3 characters'],
            maxLength: [30, 'Username must be at most 30 characters'],
        },
        passwordHash: {
            type: String,
            required: true,     //this is something called a bcrypt hash, basically plain passwords never reach the model
            select: false,      // never returned unless explicitly requested
        },
        role: {
            type: String,
            enum: ['agent', 'overseer'],
            default: 'agent',   // overseers are seeded/promoted directly in the DB
        },
        // Write-heavy
        points: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ['Active', 'MIA', 'Reassigned', 'Deceased'],
            default: 'Active',
        },
        avatarUrl: {
            type: String,
            match: [/^https:\/\/.+/, 'Avatar URL must be https'],
        },
        //Mock roster entries; lets the seed wipe ONLY its own users on re-run
        isSeeded: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        //  res.json() should call to toJson so secrets are stripped per response
        toJSON: {
            transform(doc, ret) {
                delete ret.passwordHash;
                delete ret.__v;
                return ret;
            },
        },
    }
);

export default mongoose.model('User', userSchema);