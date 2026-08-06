//main server
import 'dotenv/config'; //insurance for .env.PORT
import cors from 'cors';
import express from 'express';
import connectDB from './db/conn.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
//only the frontend origin, not the wildcard. Env var so prod can differ from dev.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json()); //this should parse json requests
//Express 5 leaves req.body undefined when no parser matched (v4 gave you {}),
//so destructuring it in a controller throws a TypeError and reads as a 500.
app.use((req, res, next) => { req.body ??= {}; next(); });

// ---- Routes ----
// Root route: I want this to confirm the server is alive
app.get('/', (req, res) => {
    res.json({ message: 'Field Command - Foundation Anomaly Reporting Network' }); //i know...corny as hell
});

// Routers mounted here as they're built:
app.use('/auth', authRoutes);
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