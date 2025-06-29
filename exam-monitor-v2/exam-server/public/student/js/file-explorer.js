/**
 * File Explorer Component
 * Project files management with tree structure and multi-file editing
 * Express API & Vanilla JS project support
 */

export class FileExplorer {
    constructor() {
        this.container = null;
        this.fileTree = new Map(); // File structure cache
        this.openFiles = new Map(); // Currently opened files
        this.activeFile = null; // Current active file
        this.projectType = 'vanilla'; // 'vanilla' or 'express'
        this.projectRoot = ''; // Project root directory
        this.isLoading = false;

        this.init();
    }

    /**
     * Initialize file explorer
     */
    init() {
        this.container = document.querySelector('.files-panel');
        if (!this.container) {
            console.warn('Files panel container not found');
            return;
        }

        this.bindEvents();
        this.loadProjectStructure();

        console.log('File Explorer initialized');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // File action buttons
        const newFileBtn = this.container.querySelector('.file-action-btn.new-file');
        const uploadBtn = this.container.querySelector('.file-action-btn.upload');
        const refreshBtn = this.container.querySelector('.file-action-btn.refresh');

        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => this.createNewFile());
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.uploadFile());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshFileTree());
        }

        // File tree events (delegated)
        const filesContent = this.container.querySelector('.files-content');
        if (filesContent) {
            filesContent.addEventListener('click', (e) => this.handleFileTreeClick(e));
            filesContent.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
            filesContent.addEventListener('dblclick', (e) => this.handleFileDoubleClick(e));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.createNewFile();
                        }
                        break;
                    case 'o':
                        e.preventDefault();
                        this.uploadFile();
                        break;
                    case 'r':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.refreshFileTree();
                        }
                        break;
                }
            }
        });
    }

    /**
     * Load project file structure
     */
    async loadProjectStructure() {
        this.setLoading(true);

        try {
            // Get current session ID
            const sessionId = window.ExamApp?.sessionId;
            if (!sessionId) {
                this.showEmptyState();
                return;
            }

            // Fetch project files from server
            const response = await fetch(`/api/project/files?sessionId=${sessionId}`);
            const data = await response.json();

            if (data.success) {
                this.projectType = data.projectType || 'vanilla';
                this.projectRoot = data.projectRoot || '';
                this.fileTree.clear();

                // Build file tree structure
                this.buildFileTree(data.files);
                this.renderFileTree();

                console.log('Project structure loaded:', this.projectType);
            } else {
                // No project yet - show template selection
                this.showProjectTemplates();
            }

        } catch (error) {
            console.error('Failed to load project structure:', error);
            this.showEmptyState('Failed to load project files');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Build file tree from server data
     * @param {Array} files - Array of file objects from server
     */
    buildFileTree(files) {
        files.forEach(file => {
            const pathParts = file.path.split('/');
            let currentLevel = this.fileTree;

            pathParts.forEach((part, index) => {
                if (!currentLevel.has(part)) {
                    const isFile = index === pathParts.length - 1;
                    currentLevel.set(part, {
                        name: part,
                        type: isFile ? 'file' : 'folder',
                        path: pathParts.slice(0, index + 1).join('/'),
                        size: file.size || 0,
                        modified: file.modified || Date.now(),
                        extension: isFile ? this.getFileExtension(part) : null,
                        children: isFile ? null : new Map(),
                        isOpen: false,
                        content: file.content || ''
                    });
                }

                if (!currentLevel.get(part).children) return;
                currentLevel = currentLevel.get(part).children;
            });
        });
    }

    /**
     * Render file tree in DOM
     */
    renderFileTree() {
        const filesContent = this.container.querySelector('.files-content');
        if (!filesContent) return;

        // Clear existing content
        filesContent.innerHTML = '';

        if (this.fileTree.size === 0) {
            this.showEmptyState();
            return;
        }

        // Create file tree container
        const treeContainer = document.createElement('div');
        treeContainer.className = 'file-tree';

        // Render tree items
        this.renderTreeLevel(this.fileTree, treeContainer, 0);

        filesContent.appendChild(treeContainer);

        // Add file statistics
        this.renderFileStats(filesContent);
    }

    /**
     * Render specific tree level
     * @param {Map} level - Current tree level
     * @param {HTMLElement} container - Container element
     * @param {number} depth - Current depth level
     */
    renderTreeLevel(level, container, depth) {
        const sortedItems = Array.from(level.entries()).sort((a, b) => {
            // Folders first, then files alphabetically
            const [nameA, itemA] = a;
            const [nameB, itemB] = b;

            if (itemA.type !== itemB.type) {
                return itemA.type === 'folder' ? -1 : 1;
            }

            return nameA.localeCompare(nameB);
        });

        sortedItems.forEach(([name, item]) => {
            const treeItem = this.createTreeItem(item, depth);
            container.appendChild(treeItem);

            // Add children if folder is open
            if (item.type === 'folder' && item.isOpen && item.children.size > 0) {
                this.renderTreeLevel(item.children, container, depth + 1);
            }
        });
    }

    /**
     * Create individual tree item element
     * @param {Object} item - File/folder item
     * @param {number} depth - Nesting depth
     * @returns {HTMLElement} - Tree item element
     */
    createTreeItem(item, depth) {
        const itemElement = document.createElement('div');
        itemElement.className = 'file-tree-item';
        itemElement.setAttribute('data-level', depth);
        itemElement.setAttribute('data-path', item.path);
        itemElement.setAttribute('data-type', item.type);

        // Add active class if this file is currently open
        if (this.activeFile === item.path) {
            itemElement.classList.add('active');
        }

        // Expand icon (for folders)
        const expandIcon = document.createElement('span');
        expandIcon.className = 'file-expand-icon';

        if (item.type === 'folder') {
            expandIcon.className += item.isOpen ? ' expanded' : ' collapsed';
            expandIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFolder(item.path);
            });
        } else {
            expandIcon.className += ' no-children';
        }

        // File icon
        const fileIcon = document.createElement('span');
        fileIcon.className = `file-icon ${this.getIconClass(item)}`;

        // File name
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = item.name;

        // Add unsaved indicator if needed
        if (this.openFiles.has(item.path) && this.openFiles.get(item.path).modified) {
            fileName.classList.add('unsaved');
        }

        // File actions (appear on hover)
        const fileActions = document.createElement('div');
        fileActions.className = 'file-actions';

        if (item.type === 'file') {
            fileActions.innerHTML = `
                <button class="file-action rename" title="Rename" data-action="rename"></button>
                <button class="file-action duplicate" title="Duplicate" data-action="duplicate"></button>
                <button class="file-action delete" title="Delete" data-action="delete"></button>
            `;
        }

        // File metadata (size, modified date)
        const metadata = document.createElement('div');
        metadata.className = 'file-metadata';

        if (item.type === 'file') {
            metadata.innerHTML = `
                <span class="file-size">${this.formatFileSize(item.size)}</span>
            `;
        }

        // Assemble item
        itemElement.appendChild(expandIcon);
        itemElement.appendChild(fileIcon);
        itemElement.appendChild(fileName);
        itemElement.appendChild(fileActions);
        itemElement.appendChild(metadata);

        return itemElement;
    }

    /**
     * Handle file tree click events
     * @param {Event} e - Click event
     */
    handleFileTreeClick(e) {
        const treeItem = e.target.closest('.file-tree-item');
        if (!treeItem) return;

        const path = treeItem.getAttribute('data-path');
        const type = treeItem.getAttribute('data-type');
        const action = e.target.getAttribute('data-action');

        // Handle file actions
        if (action) {
            e.stopPropagation();
            this.handleFileAction(action, path);
            return;
        }

        // Handle file/folder selection
        if (type === 'folder') {
            this.toggleFolder(path);
        } else {
            this.selectFile(path);
        }
    }

    /**
     * Handle file double-click (open file)
     * @param {Event} e - Double-click event
     */
    handleFileDoubleClick(e) {
        const treeItem = e.target.closest('.file-tree-item');
        if (!treeItem) return;

        const path = treeItem.getAttribute('data-path');
        const type = treeItem.getAttribute('data-type');

        if (type === 'file') {
            this.openFile(path);
        }
    }

    /**
     * Toggle folder open/closed state
     * @param {string} folderPath - Path to folder
     */
    toggleFolder(folderPath) {
        const folder = this.findItemByPath(folderPath);
        if (!folder || folder.type !== 'folder') return;

        folder.isOpen = !folder.isOpen;
        this.renderFileTree();

        // Save expanded state to localStorage
        this.saveExpandedState();
    }

    /**
     * Select file in tree (highlight)
     * @param {string} filePath - Path to file
     */
    selectFile(filePath) {
        // Remove previous selection
        const prevSelected = this.container.querySelector('.file-tree-item.active');
        if (prevSelected) {
            prevSelected.classList.remove('active');
        }

        // Add selection to new file
        const newSelected = this.container.querySelector(`[data-path="${filePath}"]`);
        if (newSelected) {
            newSelected.classList.add('active');
        }

        this.activeFile = filePath;
    }

    /**
     * Open file in editor
     * @param {string} filePath - Path to file to open
     */
    async openFile(filePath) {
        try {
            const file = this.findItemByPath(filePath);
            if (!file || file.type !== 'file') return;

            // Load file content if not already loaded
            if (!file.content) {
                const response = await fetch(`/api/project/file/${encodeURIComponent(filePath)}?sessionId=${window.ExamApp?.sessionId}`);
                const data = await response.json();

                if (data.success) {
                    file.content = data.content;
                } else {
                    throw new Error(data.error || 'Failed to load file');
                }
            }

            // Add to open files
            this.openFiles.set(filePath, {
                content: file.content,
                originalContent: file.content,
                modified: false,
                language: this.getLanguageFromExtension(file.extension)
            });

            // Create editor tab
            this.createEditorTab(file);

            // Switch to this file in Monaco editor
            this.switchToFile(filePath);

            // Select in tree
            this.selectFile(filePath);

            console.log('File opened:', filePath);

        } catch (error) {
            console.error('Failed to open file:', error);
            this.showNotification('Failed to open file: ' + error.message, 'error');
        }
    }

    /**
     * Create new file
     */
    async createNewFile() {
        const fileName = prompt('Enter file name:');
        if (!fileName) return;

        try {
            const sessionId = window.ExamApp?.sessionId;
            const response = await fetch('/api/project/file/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    fileName,
                    content: this.getDefaultContent(fileName)
                })
            });

            const data = await response.json();
            if (data.success) {
                await this.refreshFileTree();
                await this.openFile(fileName);
                this.showNotification('File created successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to create file');
            }

        } catch (error) {
            console.error('Failed to create file:', error);
            this.showNotification('Failed to create file: ' + error.message, 'error');
        }
    }

    /**
     * Upload file
     */
    uploadFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.js,.html,.css,.json,.md,.txt';

        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            try {
                for (const file of files) {
                    await this.uploadSingleFile(file);
                }

                await this.refreshFileTree();
                this.showNotification(`${files.length} file(s) uploaded successfully`, 'success');

            } catch (error) {
                console.error('Upload failed:', error);
                this.showNotification('Upload failed: ' + error.message, 'error');
            }
        });

        input.click();
    }

    /**
     * Upload single file to server
     * @param {File} file - File object to upload
     */
    async uploadSingleFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', window.ExamApp?.sessionId);

        const response = await fetch('/api/project/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Upload failed');
        }

        return data;
    }

    /**
     * Refresh file tree from server
     */
    async refreshFileTree() {
        await this.loadProjectStructure();
        this.showNotification('File tree refreshed', 'info');
    }

    /**
     * Show project templates for new projects
     */
    showProjectTemplates() {
        const filesContent = this.container.querySelector('.files-content');
        if (!filesContent) return;

        filesContent.innerHTML = `
            <div class="project-templates">
                <div class="templates-header">
                    <h4>Choose Project Template</h4>
                    <p>Select a starting template for your exam project</p>
                </div>
                
                <div class="template-options">
                    <div class="template-option" data-template="vanilla">
                        <h5>Vanilla HTML/CSS/JS</h5>
                        <p>Basic frontend project with HTML, CSS, and JavaScript</p>
                        <div class="template-files">
                            <span>index.html</span>
                            <span>style.css</span>
                            <span>script.js</span>
                        </div>
                    </div>
                    
                    <div class="template-option" data-template="express">
                        <h5>Express API</h5>
                        <p>Node.js backend project with Express server</p>
                        <div class="template-files">
                            <span>app.js</span>
                            <span>package.json</span>
                            <span>routes/</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind template selection
        filesContent.addEventListener('click', (e) => {
            const template = e.target.closest('.template-option');
            if (template) {
                const templateType = template.getAttribute('data-template');
                this.createProjectFromTemplate(templateType);
            }
        });
    }

    /**
     * Create project from template
     * @param {string} templateType - 'vanilla' or 'express'
     */
    async createProjectFromTemplate(templateType) {
        try {
            this.setLoading(true);

            const response = await fetch('/api/project/create-from-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.ExamApp?.sessionId,
                    templateType
                })
            });

            const data = await response.json();
            if (data.success) {
                this.projectType = templateType;
                await this.loadProjectStructure();
                this.showNotification(`${templateType} project created successfully`, 'success');
            } else {
                throw new Error(data.error || 'Failed to create project');
            }

        } catch (error) {
            console.error('Template creation failed:', error);
            this.showNotification('Failed to create project: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Utility functions
     */

    getFileExtension(fileName) {
        const parts = fileName.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    getIconClass(item) {
        if (item.type === 'folder') {
            return item.isOpen ? 'folder open' : 'folder';
        }

        const ext = item.extension;
        const iconMap = {
            'js': 'file-js',
            'html': 'file-html',
            'css': 'file-css',
            'json': 'file-json',
            'md': 'file-md',
            'txt': 'file-txt',
            'png': 'file-img',
            'jpg': 'file-img',
            'gif': 'file-img'
        };

        return iconMap[ext] || 'file-default';
    }

    getLanguageFromExtension(ext) {
        const langMap = {
            'js': 'javascript',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'txt': 'plaintext'
        };

        return langMap[ext] || 'plaintext';
    }

    getDefaultContent(fileName) {
        const ext = this.getFileExtension(fileName);
        const templates = {
            'html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>',
            'css': '/* Styles */\n',
            'js': '// JavaScript code\n',
            'json': '{\n    \n}'
        };

        return templates[ext] || '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    findItemByPath(path) {
        const pathParts = path.split('/');
        let current = this.fileTree;

        for (const part of pathParts) {
            if (!current.has(part)) return null;
            const item = current.get(part);
            if (item.type === 'folder' && item.children) {
                current = item.children;
            } else {
                return item;
            }
        }

        return null;
    }

    showEmptyState(message = 'No files found') {
        const filesContent = this.container.querySelector('.files-content');
        if (!filesContent) return;

        filesContent.innerHTML = `
            <div class="file-tree-empty">
                <div class="empty-folder-icon">📁</div>
                <div class="empty-title">No Files</div>
                <div class="empty-description">${message}</div>
                <div class="empty-actions">
                    <button class="empty-action-btn" onclick="window.ExamApp.fileExplorer.createNewFile()">
                        Create File
                    </button>
                    <button class="empty-action-btn" onclick="window.ExamApp.fileExplorer.uploadFile()">
                        Upload Files
                    </button>
                </div>
            </div>
        `;
    }

    setLoading(loading) {
        this.isLoading = loading;
        // Add loading indicator to files content if needed
    }

    showNotification(message, type = 'info') {
        // Integrate with existing notification system
        if (window.ExamApp?.showNotification) {
            window.ExamApp.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialize file explorer
let fileExplorer;

export function initializeFileExplorer() {
    if (fileExplorer) {
        fileExplorer.destroy?.();
    }

    fileExplorer = new FileExplorer();

    // Expose for debugging and integration
    if (window.ExamApp) {
        window.ExamApp.fileExplorer = fileExplorer;
    }

    return fileExplorer;
}

export function getFileExplorer() {
    return fileExplorer;
}