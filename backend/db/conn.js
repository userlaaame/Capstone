import mongoose from 'mongoose';
import 'dotenv/config';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.ATLAS_URI);
        console.log(`MongoDB connected: ${mongoose.connection.name}`);
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        process.exit(1); //if the DB doesn't serve then I want a notice at startup instead of at first request
    }
};

export default connectDB;