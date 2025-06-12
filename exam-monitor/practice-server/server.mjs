import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3030;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Authorization, X-Admin, X-Student-ID');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Logging middleware
app.use((req, res, next) => {
    console.info(`<< ${req.method} ${req.url}`);
    next();
});

// Load data
const dataPath = path.join(__dirname, 'data');
const data = fs.existsSync(dataPath) ? fs.readdirSync(dataPath).reduce((p, c) => {
    const content = JSON.parse(fs.readFileSync(path.join(dataPath, c), 'utf8'));
    const collection = c.slice(0, -5);
    p[collection] = content;
    return p;
}, {}) : {};

// Utility function
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Error classes
class ServiceError extends Error {
    constructor(message = 'Service Error', status = 400) {
        super(message);
        this.status = status;
    }
}

class NotFoundError extends ServiceError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Server Error';
    res.status(status).json({ code: status, message });
};

// Routes
app.get('/admin', (req, res) => {
    res.send('Admin panel not implemented');
});

// JSONSTORE Routes
app.get('/jsonstore/:collection?/:id?', (req, res) => {
    const { collection, id } = req.params;

    if (!collection) {
        // Return all collections
        return res.json(Object.keys(data));
    }

    if (!data[collection]) {
        throw new NotFoundError(`Collection ${collection} not found`);
    }

    if (id) {
        if (!data[collection][id]) {
            throw new NotFoundError(`Item ${id} not found in collection ${collection}`);
        }
        return res.json({ ...data[collection][id], _id: id });
    }

    // Return all items in collection as array
    const items = Object.entries(data[collection]).map(([key, value]) => ({
        ...value,
        _id: key
    }));
    res.json(items);
});

app.post('/jsonstore/:collection', (req, res) => {
    const { collection } = req.params;

    if (!data[collection]) {
        data[collection] = {};
    }

    const newId = uuid();
    data[collection][newId] = { ...req.body, _id: newId };

    res.status(201).json(data[collection][newId]);
});

app.put('/jsonstore/:collection/:id', (req, res) => {
    const { collection, id } = req.params;

    if (!data[collection]) {
        throw new NotFoundError(`Collection ${collection} not found`);
    }

    if (!data[collection][id]) {
        throw new NotFoundError(`Item ${id} not found in collection ${collection}`);
    }

    data[collection][id] = { ...req.body, _id: id };
    res.json(data[collection][id]);
});

app.patch('/jsonstore/:collection/:id', (req, res) => {
    const { collection, id } = req.params;

    if (!data[collection]) {
        throw new NotFoundError(`Collection ${collection} not found`);
    }

    if (!data[collection][id]) {
        throw new NotFoundError(`Item ${id} not found in collection ${collection}`);
    }

    Object.assign(data[collection][id], req.body);
    res.json(data[collection][id]);
});

app.delete('/jsonstore/:collection/:id', (req, res) => {
    const { collection, id } = req.params;

    if (!data[collection]) {
        throw new NotFoundError(`Collection ${collection} not found`);
    }

    if (!data[collection][id]) {
        throw new NotFoundError(`Item ${id} not found in collection ${collection}`);
    }

    const deleted = data[collection][id];
    delete data[collection][id];
    res.json(deleted);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        code: 404,
        message: `Service "${req.path.split('/')[1]}" is not supported`
    });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}. You can make requests to http://localhost:${PORT}/`);
    console.log(`Admin panel located at http://localhost:${PORT}/admin`);
});

export default app;