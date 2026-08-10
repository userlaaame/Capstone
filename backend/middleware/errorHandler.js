// ---- error handler ----
// Central error handler — Express 5 forwards thrown async errors here.

const errorHandler = (err, req, res, next) => {
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }
    //for invalid ObjectId in :id param
    if (err.name === 'CastError') {
        return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` });//typo error here with err.path
    }
    //for Duplicate keys and handling unique index
    //400 = you sent bad data, 409 = conflict with existing data, 500 = our fault
    if (err.code === 11000) {
        return res.status(409).json({ error: `Duplicate value: ${JSON.stringify(err.keyValue)}` });
    }
    // for Database jsonSchema rejection
    if (err.code === 121) { // code 121 = DocumentValidationfailure, this now sits above 500 and works properly
        return res.status(400).json({ error: 'Document failed database-level validation' })
    }
    // body-parser marks client-fault errors with expose:true and the right status
    // already set: bad JSON (400), payload too large (413), bad content-type (415).
    // Without this they all fall through and get reported as my fault.
    if (err.expose && err.statusCode >= 400 && err.statusCode < 500) {
        return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
};

export default errorHandler;