//main server
import 'dotenv/config'; //insurance for .env.PORT
import cors from 'cors';
import express from 'express';
import connectDB from './db/conn.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
app.use(cors()); //should allow for browser requests from anywhere
app.use(express.json()); //this should parse json requests

// ---- Routes ----
// Root route: I want this to confirm the server is alive
app.get('/', (req, res) => {
    res.json({ message: 'Field Command - Foundation Anomaly Reporting Network' }); //i know...corny as hell
});

// Routers mounted here as they're built:
// app.use('/auth', authRoutes);
// app.use('/scps', scpRoutes);
// app.use('/users', userRoutes);
// app.use('/incidents', incidentRoutes);

// ---- 404 catch-all ----
app.use((req, res) => {
    res.status(404).json({ error: 'Resource not found or above clearance level.' });
});

// ---- error handler ----
app.use(errorHandler);

// ---- start ----
// Connect to the database BEFORE accepting requests
await connectDB();

app.listen(PORT, () => {
    console.log(`Field Command API listening on http://localhost:${PORT}`);
});