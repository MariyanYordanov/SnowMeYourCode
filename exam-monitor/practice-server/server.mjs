import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { StudentDataManager } from './student-data-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3030;

// Initialize StudentDataManager
const studentDataManager = new StudentDataManager(path.join(__dirname, 'data'));

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
    console.log('Student ID:', req.headers['x-student-id']);
    next();
});

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
    console.error('Error:', err);
    res.status(status).json({ code: status, message });
};

// Routes
app.get('/admin', (req, res) => {
    res.send('Admin panel not implemented');
});

// JSONSTORE Routes
app.get('/jsonstore/:collection?/:id?', async (req, res, next) => {
    try {
        const { collection, id } = req.params;
        const studentId = req.headers['x-student-id'];

        if (!studentId) {
            return res.status(400).json({
                code: 400,
                message: 'X-Student-ID header is required'
            });
        }

        const data = studentDataManager.getAllStudentData(studentId);

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
    } catch (error) {
        next(error);
    }
});

app.post('/jsonstore/:collection', async (req, res, next) => {
    try {
        const { collection } = req.params;
        const studentId = req.headers['x-student-id'];

        if (!studentId) {
            return res.status(400).json({
                code: 400,
                message: 'X-Student-ID header is required'
            });
        }

        const data = studentDataManager.getAllStudentData(studentId);

        if (!data[collection]) {
            data[collection] = {};
        }

        const newId = uuid();
        data[collection][newId] = { ...req.body, _id: newId };

        // Save the updated data
        studentDataManager.writeJsonFile(studentId, `${collection}.json`, data[collection]);

        res.status(201).json(data[collection][newId]);
    } catch (error) {
        next(error);
    }
});

app.put('/jsonstore/:collection/:id', async (req, res, next) => {
    try {
        const { collection, id } = req.params;
        const studentId = req.headers['x-student-id'];

        if (!studentId) {
            return res.status(400).json({
                code: 400,
                message: 'X-Student-ID header is required'
            });
        }

        const data = studentDataManager.getAllStudentData(studentId);

        if (!data[collection]) {
            throw new NotFoundError(`Collection ${collection} not found`);
        }

        if (!data[collection][id]) {
            throw new NotFoundError(`Item ${id} not found in collection ${collection}`);
        }

        data[collection][id] = { ...req.body, _id: id };

        // Save the updated data
        studentDataManager.writeJsonFile(studentId, `${collection}.json`, data[collection]);

        res.json(data[collection][id]);
    } catch (error) {
        next(error);
    }
});

app.patch('/jsonstore/:collection/:id', async (req, res, next) => {
    try {
        const { collection, id } = req.params;
        const studentId = req.headers['x-student-id'];

        if (!studentId) {
            return res.status(400).json({
                code: 400,
                message: 'X-Student-ID header is required'
            });
        }

        const data = studentDataManager.getAllStudentData(studentId);

        if (!data[collection]) {
            throw new NotFoundError(`Collection ${collection} not found`);
        }

        if (!data[collection][id]) {
            throw new NotFoundError(`Item ${id} not found in collection ${collection}`);
        }

        Object.assign(data[collection][id], req.body);

        // Save the updated data
        studentDataManager.writeJsonFile(studentId, `${collection}.json`, data[collection]);

        res.json(data[collection][id]);
    } catch (error) {
        next(error);
    }
});

app.delete('/jsonstore/:collection/:id', async (req, res, next) => {
    try {
        const { collection, id } = req.params;
        const studentId = req.headers['x-student-id'];

        if (!studentId) {
            return res.status(400).json({
                code: 400,
                message: 'X-Student-ID header is required'
            });
        }

        const data = studentDataManager.getAllStudentData(studentId);

        if (!data[collection]) {
            throw new NotFoundError(`Collection ${collection} not found`);
        }

        if (!data[collection][id]) {
            throw new NotFoundError(`Item ${id} not found in collection ${collection}`);
        }

        const deleted = data[collection][id];
        delete data[collection][id];

        // Save the updated data
        studentDataManager.writeJsonFile(studentId, `${collection}.json`, data[collection]);

        res.json(deleted);
    } catch (error) {
        next(error);
    }
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