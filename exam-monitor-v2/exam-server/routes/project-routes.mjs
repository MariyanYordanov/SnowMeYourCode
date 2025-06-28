/**
 * Project Files API Routes
 * Handles file management for student exam projects
 * Supports Express & Vanilla JS templates
 */

import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sessionId = req.body.sessionId;
        const uploadDir = path.join(__dirname, '..', 'student-data', sessionId, 'project-files');

        // Ensure directory exists
        fs.mkdir(uploadDir, { recursive: true })
            .then(() => cb(null, uploadDir))
            .catch(cb);
    },
    filename: (req, file, cb) => {
        // Keep original filename
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 10 // Max 10 files at once
    },
    fileFilter: (req, file, cb) => {
        // Allow only specific file types
        const allowedTypes = [
            'application/javascript',
            'text/html',
            'text/css',
            'application/json',
            'text/plain',
            'text/markdown'
        ];

        const allowedExtensions = ['.js', '.html', '.css', '.json', '.txt', '.md'];
        const fileExt = path.extname(file.originalname).toLowerCase();

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'), false);
        }
    }
});

/**
 * Project templates
 */
const PROJECT_TEMPLATES = {
    vanilla: {
        name: 'Vanilla HTML/CSS/JS',
        files: {
            'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exam Project</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>Welcome to Your Exam Project</h1>
    </header>
    
    <main>
        <section id="content">
            <p>Start building your project here!</p>
            <button id="demo-btn">Click Me</button>
        </section>
    </main>
    
    <script src="script.js"></script>
</body>
</html>`,
            'style.css': `/* Exam Project Styles */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f4f4f4;
}

header {
    background: #333;
    color: white;
    text-align: center;
    padding: 1rem;
}

main {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
}

#content {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

#demo-btn {
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 1rem;
}

#demo-btn:hover {
    background: #0056b3;
}`,
            'script.js': `// Exam Project JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Project loaded successfully!');
    
    // Demo button functionality
    const demoBtn = document.getElementById('demo-btn');
    if (demoBtn) {
        demoBtn.addEventListener('click', function() {
            alert('Hello! Start coding your exam project.');
        });
    }
    
    // Your code here...
    
});`
        }
    },

    express: {
        name: 'Express API Server',
        files: {
            'app.js': `// Express API Server - Exam Project

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to your Exam API Server!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', service: 'Exam API' });
});

// TODO: Add your API routes here
app.get('/api/users', (req, res) => {
    // Example endpoint - implement your logic
    res.json({ users: [] });
});

app.post('/api/users', (req, res) => {
    // Example endpoint - implement your logic
    res.json({ message: 'User created', user: req.body });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
    console.log(\`API available at http://localhost:\${PORT}\`);
});`,
            'package.json': `{
  "name": "exam-api-project",
  "version": "1.0.0",
  "description": "Express API Server for Exam",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test": "echo \\"No tests specified\\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "keywords": ["express", "api", "exam"],
  "author": "Student",
  "license": "ISC"
}`,
            'routes/users.js': `// User routes - Example implementation

const express = require('express');
const router = express.Router();

// In-memory storage (use database in real project)
let users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

// GET /api/users - Get all users
router.get('/', (req, res) => {
    res.json(users);
});

// GET /api/users/:id - Get user by ID
router.get('/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});

// POST /api/users - Create new user
router.post('/', (req, res) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const newUser = {
        id: users.length + 1,
        name,
        email
    };
    
    users.push(newUser);
    res.status(201).json(newUser);
});

// PUT /api/users/:id - Update user
router.put('/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const { name, email } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    
    res.json(user);
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', (req, res) => {
    const index = users.findIndex(u => u.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    users.splice(index, 1);
    res.json({ message: 'User deleted successfully' });
});

module.exports = router;`,
            'README.md': `# Express API Exam Project

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. API will be available at: http://localhost:3000

## Available Endpoints

- GET / - Welcome message
- GET /api/health - Service health check
- GET /api/users - Get all users
- GET /api/users/:id - Get user by ID
- POST /api/users - Create new user
- PUT /api/users/:id - Update user
- DELETE /api/users/:id - Delete user

## Project Structure

- \`app.js\` - Main application file
- \`routes/\` - API route handlers
- \`package.json\` - Project dependencies

## TODO

Complete the following tasks:
- [ ] Implement database connection
- [ ] Add authentication middleware
- [ ] Add input validation
- [ ] Write unit tests
- [ ] Add error logging
`
        }
    }
};

/**
 * GET /api/project/files - Get project file structure
 */
router.get('/files', async (req, res) => {
    try {
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID required' });
        }

        const projectDir = path.join(__dirname, '..', 'student-data', sessionId, 'project-files');

        // Check if project directory exists
        try {
            await fs.access(projectDir);
        } catch {
            return res.json({ success: false, error: 'No project found' });
        }

        const files = await getFileStructure(projectDir);
        const projectType = await getProjectType(projectDir);

        res.json({
            success: true,
            files,
            projectType,
            projectRoot: projectDir
        });

    } catch (error) {
        console.error('Error getting file structure:', error);
        res.status(500).json({ success: false, error: 'Failed to load project files' });
    }
});

/**
 * GET /api/project/file/:filename - Get specific file content
 */
router.get('/file/:filename', async (req, res) => {
    try {
        const { sessionId } = req.query;
        const { filename } = req.params;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID required' });
        }

        const projectDir = path.join(__dirname, '..', 'student-data', sessionId, 'project-files');
        const filePath = path.join(projectDir, decodeURIComponent(filename));

        // Security check
        if (!filePath.startsWith(projectDir)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const content = await fs.readFile(filePath, 'utf8');

        res.json({
            success: true,
            content,
            filename
        });

    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        console.error('Error reading file:', error);
        res.status(500).json({ success: false, error: 'Failed to read file' });
    }
});

/**
 * POST /api/project/file - Create new file
 */
router.post('/file', async (req, res) => {
    try {
        const { sessionId, filename, content = '' } = req.body;

        if (!sessionId || !filename) {
            return res.status(400).json({ success: false, error: 'Session ID and filename required' });
        }

        const projectDir = path.join(__dirname, '..', 'student-data', sessionId, 'project-files');
        const filePath = path.join(projectDir, filename);

        // Security check
        if (!filePath.startsWith(projectDir)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        // Create file
        await fs.writeFile(filePath, content, 'utf8');

        res.json({
            success: true,
            message: 'File created successfully',
            filename
        });

    } catch (error) {
        console.error('Error creating file:', error);
        res.status(500).json({ success: false, error: 'Failed to create file' });
    }
});

/**
 * PUT /api/project/file/:filename - Update file content
 */
router.put('/file/:filename', async (req, res) => {
    try {
        const { sessionId, content } = req.body;
        const { filename } = req.params;

        if (!sessionId || content === undefined) {
            return res.status(400).json({ success: false, error: 'Session ID and content required' });
        }

        const projectDir = path.join(__dirname, '..', 'student-data', sessionId, 'project-files');
        const filePath = path.join(projectDir, decodeURIComponent(filename));

        // Security check
        if (!filePath.startsWith(projectDir)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Update file
        await fs.writeFile(filePath, content, 'utf8');

        res.json({
            success: true,
            message: 'File updated successfully'
        });

    } catch (error) {
        console.error('Error updating file:', error);
        res.status(500).json({ success: false, error: 'Failed to update file' });
    }
});

/**
 * DELETE /api/project/file/:filename - Delete file
 */
router.delete('/file/:filename', async (req, res) => {
    try {
        const { sessionId } = req.query;
        const { filename } = req.params;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID required' });
        }

        const projectDir = path.join(__dirname, '..', 'student-data', sessionId, 'project-files');
        const filePath = path.join(projectDir, decodeURIComponent(filename));

        // Security check
        if (!filePath.startsWith(projectDir)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        await fs.unlink(filePath);

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
});

/**
 * POST /api/project/upload - Upload files
 */
router.post('/upload', upload.array('file'), async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID required' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }

        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            path: file.path
        }));

        res.json({
            success: true,
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles
        });

    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ success: false, error: 'Failed to upload files' });
    }
});

/**
 * POST /api/project/create-from-template - Create project from template
 */
router.post('/create-from-template', async (req, res) => {
    try {
        const { sessionId, templateType } = req.body;

        if (!sessionId || !templateType) {
            return res.status(400).json({ success: false, error: 'Session ID and template type required' });
        }

        const template = PROJECT_TEMPLATES[templateType];
        if (!template) {
            return res.status(400).json({ success: false, error: 'Invalid template type' });
        }

        const projectDir = path.join(__dirname, '..', 'student-data', sessionId, 'project-files');

        // Ensure project directory exists
        await fs.mkdir(projectDir, { recursive: true });

        // Create all template files
        for (const [fileName, content] of Object.entries(template.files)) {
            const filePath = path.join(projectDir, fileName);
            const fileDir = path.dirname(filePath);

            // Create subdirectory if needed
            await fs.mkdir(fileDir, { recursive: true });

            // Write file
            await fs.writeFile(filePath, content, 'utf8');
        }

        res.json({
            success: true,
            message: `${template.name} project created successfully`,
            templateType,
            filesCreated: Object.keys(template.files)
        });

    } catch (error) {
        console.error('Error creating project from template:', error);
        res.status(500).json({ success: false, error: 'Failed to create project' });
    }
});

/**
 * Helper functions
 */

async function getFileStructure(dirPath, relativePath = '') {
    const files = [];

    try {
        const items = await fs.readdir(dirPath);

        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stats = await fs.stat(fullPath);
            const relativeItemPath = path.posix.join(relativePath, item);

            if (stats.isDirectory()) {
                // Recursively get subdirectory contents
                const subFiles = await getFileStructure(fullPath, relativeItemPath);
                files.push(...subFiles);
            } else {
                // Add file info
                files.push({
                    path: relativeItemPath,
                    name: item,
                    size: stats.size,
                    modified: stats.mtime.getTime(),
                    type: 'file'
                });
            }
        }
    } catch (error) {
        console.error('Error reading directory:', error);
    }

    return files;
}

async function getProjectType(projectDir) {
    try {
        // Check for package.json (Express project)
        await fs.access(path.join(projectDir, 'package.json'));
        return 'express';
    } catch {
        // Default to vanilla
        return 'vanilla';
    }
}

export default router;