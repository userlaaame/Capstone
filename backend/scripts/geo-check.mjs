// Standalone check for the lastSeenLocation geo rules.
// Run with:  npm run geo-check   (from the backend folder)
//
// Inserts a handful of throwaway SCP documents against whatever ATLAS_URI points
// at, prints whether each was accepted or rejected, then deletes every document
// it created. It reports the SCP count before and after so I can confirm
// nothing was left behind.
import mongoose from 'mongoose';
import connectDB from '../db/conn.js';
import Scp from '../models/Scp.js';
import User from '../models/User.js';

await connectDB();

const before = await Scp.countDocuments();
console.log(`SCP count before: ${before}\n`);

const submitter = await User.findOne();
if (!submitter) {
    console.error('No users found, run `npm run seed` first.');
    await mongoose.connection.close();
    process.exit(1);
}

const base = {
    title: 'GEO-CHECK safe to delete',
    description: 'Created by scripts/geo-check.mjs',
    status: 'pending',
    submittedBy: submitter._id,
};

const created = [];

const attempt = async (label, lastSeenLocation) => {
    try {
        const doc = await Scp.create({ ...base, lastSeenLocation });
        created.push(doc._id);
        const stored = doc.toObject().lastSeenLocation;
        console.log(`  ACCEPTED  ${label.padEnd(32)} stored: ${JSON.stringify(stored) ?? 'field absent'}`);
    } catch (err) {
        const why = err.code === 16755 ? `MongoDB ${err.code} Can't extract geo keys` : err.message;
        console.log(`  REJECTED  ${label.padEnd(32)} ${why.replace(/\s+/g, ' ').slice(0, 80)}`);
    }
};

console.log('--- these SHOULD be accepted ---');
await attempt('no location at all', undefined);
await attempt('valid [lng, lat]', { type: 'Point', coordinates: [-72.68, 41.76] });

console.log('\n--- these SHOULD be rejected ---');
await attempt('coordinates key missing', { type: 'Point' });
await attempt('empty coordinates array', { type: 'Point', coordinates: [] });
await attempt('three elements', { type: 'Point', coordinates: [1, 2, 3] });
await attempt('longitude out of range', { type: 'Point', coordinates: [500, 900] });

console.log('\n--- the known limitation: this one gets through ---');
await attempt('lat/lng swapped', { type: 'Point', coordinates: [41.76, -72.68] });
console.log('  ^ both numbers are individually in range, so nothing can catch it here.');
console.log('    [-72.68, 41.76] is Connecticut. [41.76, -72.68] is open ocean near Somalia.');

// cleanup
for (const id of created) await Scp.deleteOne({ _id: id });
const after = await Scp.countDocuments();
console.log(`\nRemoved ${created.length} test document(s).`);
console.log(`SCP count after: ${after}  ${after === before ? '(matches, nothing left behind)' : '(MISMATCH - check manually)'}`);

await mongoose.connection.close();
