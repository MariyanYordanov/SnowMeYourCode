/**
 * Project Files API Routes
 * Handles file management for student exam projects
 * Supports Express & Vanilla JS templates
 */

import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
// Removed multer import - no longer needed with exam-files approach
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Multer configuration removed - using exam-files approach instead

// Project templates removed - using exam-files approach instead
// All templates are now served from practice-server/exam-files/

/**
 * GET /api/project/files - Get project file structure
 */
router.get('/files', async (req, res) => {
    try {
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID required' });
        }

        // Decode session ID and extract class (handles Cyrillic)
        const decodedSessionId = decodeURIComponent(sessionId);
        const classFromSession = decodedSessionId.split('-')[0].toUpperCase();
        const projectDir = path.join(__dirname, '..', 'data', 'classes', classFromSession, decodedSessionId, 'project-files');
        const examFilesDir = path.join(__dirname, '..', '..', 'practice-server', 'exam-files');

        let useExamFiles = false;
        let sourceDir = projectDir;

        // Check if project directory exists AND has files
        let needsCopy = false;
        try {
            await fs.access(projectDir);
            // Directory exists, check if it has files
            const files = await fs.readdir(projectDir);
            if (files.length === 0) {
                needsCopy = true;
            }
        } catch {
            // Directory doesn't exist
            needsCopy = true;
        }

        if (needsCopy) {
            try {
                await fs.access(examFilesDir);
                useExamFiles = true;
                sourceDir = examFilesDir;

                // Copy exam files to student directory
                await fs.mkdir(projectDir, { recursive: true });
                await copyDirectory(examFilesDir, projectDir);

                // Install npm dependencies if package.json exists
                await installProjectDependencies(projectDir, sessionId);

                console.log(`Initialized project files for session ${sessionId} from exam-files`);

            } catch {
                return res.json({ success: false, error: 'No project files available' });
            }
        }

        const files = await getFileStructure(sourceDir);
        const projectType = await getProjectType(sourceDir);

        res.json({
            success: true,
            files,
            projectType,
            projectRoot: sourceDir,
            source: useExamFiles ? 'exam-files' : 'session-files'
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

        const decodedSessionId = decodeURIComponent(sessionId);
        const classFromSession = decodedSessionId.split('-')[0].toUpperCase();
        const projectDir = path.join(__dirname, '..', 'data', 'classes', classFromSession, decodedSessionId, 'project-files');
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

        const decodedSessionId = decodeURIComponent(sessionId);
        const classFromSession = decodedSessionId.split('-')[0].toUpperCase();
        const projectDir = path.join(__dirname, '..', 'data', 'classes', classFromSession, decodedSessionId, 'project-files');
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

        const decodedSessionId = decodeURIComponent(sessionId);
        const classFromSession = decodedSessionId.split('-')[0].toUpperCase();
        const projectDir = path.join(__dirname, '..', 'data', 'classes', classFromSession, decodedSessionId, 'project-files');
        const filePath = path.join(projectDir, decodeURIComponent(filename));

        // Security check
        if (!filePath.startsWith(projectDir)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Ensure parent directory exists
        const parentDir = path.dirname(filePath);
        console.log('Creating parent directory:', parentDir);
        await fs.mkdir(parentDir, { recursive: true });

        // Update file
        console.log('Writing file:', filePath);
        await fs.writeFile(filePath, content, 'utf8');

        console.log('File saved successfully:', filename);
        res.json({
            success: true,
            message: 'File updated successfully'
        });

    } catch (error) {
        console.error('Error updating file:', error);
        console.error('   File path:', filePath);
        console.error('   Error details:', error.message, error.code);
        res.status(500).json({ success: false, error: 'Failed to update file', details: error.message });
    }
});

/**
 * POST /api/project/folder - Create a new folder
 */
router.post('/folder', async (req, res) => {
    try {
        const { sessionId, folderPath } = req.body;

        if (!sessionId || !folderPath) {
            return res.status(400).json({ success: false, error: 'Session ID and folder path required' });
        }

        const decodedSessionId = decodeURIComponent(sessionId);
        const classFromSession = decodedSessionId.split('-')[0].toUpperCase();
        const projectDir = path.join(__dirname, '..', 'data', 'classes', classFromSession, decodedSessionId, 'project-files');
        const fullFolderPath = path.join(projectDir, folderPath);

        // Security check
        if (!fullFolderPath.startsWith(projectDir)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        console.log('Creating folder:', fullFolderPath);

        // Create the directory
        await fs.mkdir(fullFolderPath, { recursive: true });

        console.log('Folder created successfully:', folderPath);

        res.json({
            success: true,
            message: 'Folder created successfully',
            folderPath: folderPath
        });

    } catch (error) {
        console.error('Error creating folder:', error);
        console.error('   Folder path:', folderPath);
        console.error('   Error details:', error.message, error.code);
        res.status(500).json({ success: false, error: 'Failed to create folder', details: error.message });
    }
});

/**
 * DELETE /api/project/folder/:folderPath - Delete folder
 */
router.delete('/folder/:folderPath(*)', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const folderPath = decodeURIComponent(req.params.folderPath);

        if (!sessionId || !folderPath) {
            return res.status(400).json({ success: false, error: 'Session ID and folder path required' });
        }

        const decodedSessionId = decodeURIComponent(sessionId);
        const classFromSession = decodedSessionId.split('-')[0].toUpperCase();
        const projectDir = path.join(__dirname, '..', 'data', 'classes', classFromSession, decodedSessionId, 'project-files');
        const fullFolderPath = path.join(projectDir, folderPath);

        // Security check
        if (!fullFolderPath.startsWith(projectDir)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        console.log('Deleting folder:', fullFolderPath);

        // Delete the directory and all its contents
        await fs.rm(fullFolderPath, { recursive: true, force: true });

        console.log('Folder deleted successfully:', folderPath);

        res.json({
            success: true,
            message: 'Folder deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting folder:', error);
        console.error('   Folder path:', folderPath);
        console.error('   Error details:', error.message, error.code);
        res.status(500).json({ success: false, error: 'Failed to delete folder', details: error.message });
    }
});

/**
 * DELETE /api/project/file/:filename - Delete file
 */
router.delete('/file/:filename', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const { filename } = req.params;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID required' });
        }

        const decodedSessionId = decodeURIComponent(sessionId);
        const classFromSession = decodedSessionId.split('-')[0].toUpperCase();
        const projectDir = path.join(__dirname, '..', 'data', 'classes', classFromSession, decodedSessionId, 'project-files');
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
 * POST /api/project/file/rename - Rename file
 */
router.post('/file/rename', async (req, res) => {
    try {
        const { sessionId, oldPath, newPath } = req.body;

        if (!sessionId || !oldPath || !newPath) {
            return res.status(400).json({ success: false, error: 'Session ID, oldPath, and newPath required' });
        }

        const decodedSessionId = decodeURIComponent(sessionId);
        const classFromSession = decodedSessionId.split('-')[0].toUpperCase();
        const projectDir = path.join(__dirname, '..', 'data', 'classes', classFromSession, decodedSessionId, 'project-files');
        const oldFilePath = path.join(projectDir, oldPath);
        const newFilePath = path.join(projectDir, newPath);

        // Security checks
        if (!oldFilePath.startsWith(projectDir) || !newFilePath.startsWith(projectDir)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Check if old file exists
        try {
            await fs.access(oldFilePath);
        } catch {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        // Check if new file already exists
        try {
            await fs.access(newFilePath);
            return res.status(409).json({ success: false, error: 'File already exists' });
        } catch {
            // File doesn't exist - good to proceed
        }

        // Ensure target directory exists
        await fs.mkdir(path.dirname(newFilePath), { recursive: true });

        // Rename the file
        await fs.rename(oldFilePath, newFilePath);

        res.json({
            success: true,
            message: 'File renamed successfully',
            oldPath,
            newPath
        });

    } catch (error) {
        console.error('Error renaming file:', error);
        res.status(500).json({ success: false, error: 'Failed to rename file' });
    }
});

// Upload and template endpoints removed - using exam-files approach instead

/**
 * Helper functions
 */

async function getFileStructure(dirPath, relativePath = '') {
    const items = [];

    try {
        const dirItems = await fs.readdir(dirPath);

        for (const item of dirItems) {
            const fullPath = path.join(dirPath, item);
            const stats = await fs.stat(fullPath);
            const relativeItemPath = path.posix.join(relativePath, item);

            if (stats.isDirectory()) {
                // Add folder to the list
                items.push({
                    path: relativeItemPath,
                    name: item,
                    modified: stats.mtime.getTime(),
                    type: 'folder'
                });

                // Recursively get subdirectory contents
                const subItems = await getFileStructure(fullPath, relativeItemPath);
                items.push(...subItems);
            } else {
                // Add file info
                items.push({
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

    return items;
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

async function copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        // Skip node_modules and system files
        if (['node_modules', '.git', '.DS_Store', 'package-lock.json'].includes(entry.name)) {
            continue;
        }
        
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function installProjectDependencies(projectDir, sessionId) {
    try {
        // Check if package.json exists
        const packageJsonPath = path.join(projectDir, 'package.json');
        await fs.access(packageJsonPath);
        
        console.log(`Installing dependencies for session ${sessionId}...`);
        
        // Run npm install using spawn
        const { spawn } = await import('child_process');
        
        return new Promise((resolve, reject) => {
            const npmProcess = spawn('npm', ['install'], {
                cwd: projectDir,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let output = '';
            let errorOutput = '';
            
            npmProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            npmProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            npmProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`Dependencies installed successfully for session ${sessionId}`);
                    resolve();
                } else {
                    console.error(`npm install failed for session ${sessionId}:`, errorOutput);
                    reject(new Error(`npm install failed with code ${code}`));
                }
            });
            
            // Timeout after 90 seconds
            setTimeout(() => {
                npmProcess.kill('SIGTERM');
                reject(new Error('npm install timeout'));
            }, 90000);
        });
        
    } catch (error) {
        // No package.json or other error - not a Node.js project
        console.log(`No package.json found for session ${sessionId} - skipping npm install`);
    }
}

// Track running student servers
const studentServers = new Map();
let nextPort = 4000;

async function startStudentServer(projectDir, sessionId) {
    try {
        // Check if server is already running
        if (studentServers.has(sessionId)) {
            const existing = studentServers.get(sessionId);
            if (existing.process && !existing.process.killed) {
                return existing.port;
            }
        }

        // Find available port
        const port = await findAvailablePort(nextPort);
        nextPort = port + 1;

        console.log(`Starting Express server for session ${sessionId} on port ${port}...`);

        // Read package.json to get start script
        const packageJsonPath = path.join(projectDir, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        // Determine start command
        let startCommand = 'node';
        let startArgs = ['./src/index.js']; // Default
        
        if (packageJson.scripts && packageJson.scripts.start) {
            const startScript = packageJson.scripts.start;
            if (startScript.includes('nodemon')) {
                startCommand = 'node'; // Use node instead of nodemon
                startArgs = ['./src/index.js'];
            } else if (startScript.includes('node')) {
                const parts = startScript.split(' ');
                startArgs = parts.slice(1); // Remove 'node'
            }
        }

        // Spawn the process
        const { spawn } = await import('child_process');
        
        const serverProcess = spawn(startCommand, startArgs, {
            cwd: projectDir,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PORT: port.toString(),
                NODE_ENV: 'development'
            }
        });

        // Store server info
        studentServers.set(sessionId, {
            process: serverProcess,
            port: port,
            startTime: Date.now()
        });

        // Handle server output
        serverProcess.stdout.on('data', (data) => {
            console.log(`[${sessionId}:${port}] ${data.toString().trim()}`);
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`[${sessionId}:${port}] ERROR: ${data.toString().trim()}`);
        });

        serverProcess.on('close', (code) => {
            console.log(`[${sessionId}:${port}] Server closed with code ${code}`);
            studentServers.delete(sessionId);
        });

        serverProcess.on('error', (error) => {
            console.error(`[${sessionId}:${port}] Server error:`, error);
            studentServers.delete(sessionId);
        });

        // Wait a moment for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log(`Express server started for session ${sessionId} on port ${port}`);
        return port;

    } catch (error) {
        console.error(`Failed to start server for session ${sessionId}:`, error);
        throw error;
    }
}

async function stopStudentServer(sessionId) {
    const serverInfo = studentServers.get(sessionId);
    if (serverInfo && serverInfo.process && !serverInfo.process.killed) {
        console.log(`Stopping server for session ${sessionId} on port ${serverInfo.port}`);
        serverInfo.process.kill('SIGTERM');
        studentServers.delete(sessionId);
        return true;
    }
    return false;
}

async function findAvailablePort(startPort) {
    const { createServer } = await import('net');
    
    return new Promise((resolve, reject) => {
        const server = createServer();
        
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
}

/**
 * POST /api/project/start - Start student's Express server
 */
router.post('/start', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID required' });
        }

        const decodedSessionId = decodeURIComponent(sessionId);
        const classFromSession = decodedSessionId.split('-')[0].toUpperCase();
        const projectDir = path.join(__dirname, '..', 'data', 'classes', classFromSession, decodedSessionId, 'project-files');
        
        // Check if this is an Express project
        const projectType = await getProjectType(projectDir);
        if (projectType !== 'express') {
            return res.json({ success: false, error: 'Not an Express project' });
        }

        // Start the Express server for this student
        const port = await startStudentServer(projectDir, sessionId);
        
        res.json({
            success: true,
            message: 'Server started successfully',
            port: port,
            url: `http://localhost:${port}`
        });

    } catch (error) {
        console.error('Error starting student server:', error);
        res.status(500).json({ success: false, error: 'Failed to start server' });
    }
});

/**
 * POST /api/project/stop - Stop student's Express server
 */
router.post('/stop', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Session ID required' });
        }

        await stopStudentServer(sessionId);
        
        res.json({
            success: true,
            message: 'Server stopped successfully'
        });

    } catch (error) {
        console.error('Error stopping student server:', error);
        res.status(500).json({ success: false, error: 'Failed to stop server' });
    }
});

/**
 * GET /api/project/preview/:sessionId/* - Serve project files for preview
 */
router.get('/preview/:sessionId/*', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const filePath = req.params[0] || 'index.html';

        if (!sessionId) {
            return res.status(400).send('Session ID required');
        }

        const decodedSessionId = decodeURIComponent(sessionId);
        const classFromSession = decodedSessionId.split('-')[0].toUpperCase();
        const projectDir = path.join(__dirname, '..', 'data', 'classes', classFromSession, decodedSessionId, 'project-files');
        const fullPath = path.join(projectDir, filePath);

        // Security check
        if (!fullPath.startsWith(projectDir)) {
            return res.status(403).send('Access denied');
        }

        // Set appropriate content type
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.md': 'text/markdown'
        };

        if (contentTypes[ext]) {
            res.type(contentTypes[ext]);
        }

        // For HTML files, inject console interceptor
        if (ext === '.html') {
            let htmlContent = await fs.readFile(fullPath, 'utf8');

            // Console interceptor script
            const consoleInterceptor = `
<script>
(function() {
    const originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    };

    function sendToParent(type, args) {
        try {
            window.parent.postMessage({
                type: 'preview-console',
                method: type,
                args: Array.from(args).map(arg => {
                    if (typeof arg === 'object') {
                        try { return JSON.stringify(arg); }
                        catch { return String(arg); }
                    }
                    return String(arg);
                })
            }, '*');
        } catch (e) {}
    }

    console.log = function(...args) {
        originalConsole.log(...args);
        sendToParent('log', args);
    };
    console.info = function(...args) {
        originalConsole.info(...args);
        sendToParent('info', args);
    };
    console.warn = function(...args) {
        originalConsole.warn(...args);
        sendToParent('warn', args);
    };
    console.error = function(...args) {
        originalConsole.error(...args);
        sendToParent('error', args);
    };

    window.onerror = function(msg, url, line, col, error) {
        sendToParent('error', ['Error: ' + msg + ' (line ' + line + ')']);
        return false;
    };
})();
</script>`;

            // Inject after <head> tag
            if (htmlContent.includes('<head>')) {
                htmlContent = htmlContent.replace('<head>', '<head>' + consoleInterceptor);
            } else if (htmlContent.includes('<html>')) {
                htmlContent = htmlContent.replace('<html>', '<html><head>' + consoleInterceptor + '</head>');
            } else {
                htmlContent = consoleInterceptor + htmlContent;
            }

            return res.send(htmlContent);
        }

        // Serve other files directly
        res.sendFile(fullPath);

    } catch (error) {
        console.error('Error serving preview file:', error);
        res.status(500).send('Internal server error');
    }
});

export default router;