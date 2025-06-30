/**
 * File Explorer Component
 * Project files management with tree structure and multi-file editing
 * UPDATED: Removed upload functionality, added security restrictions
 */

export class FileExplorer {
    constructor() {
        this.container = null;
        this.fileTree = new Map();
        this.openFiles = new Map();
        this.activeFile = null;
        this.projectType = 'vanilla';
        this.projectRoot = '';
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
     * Check if file creation is allowed in given path
     * @param {string} path - Path to folder
     * @returns {boolean}
     */
    canCreateFile(path) {
        const allowedPaths = ['src/', 'components/', 'utils/', 'styles/', 'public/'];

        if (!path || path === '') return true;

        return allowedPaths.some(allowed => path.startsWith(allowed));
    }

    /**
     * Check if file is read-only
     * @param {string} filePath - Path to file
     * @returns {boolean}
     */
    isReadOnly(filePath) {
        const readOnlyFiles = [
            'package.json',
            'package-lock.json',
            'README.md',
            '.gitignore',
            'webpack.config.js',
            'tsconfig.json',
            'exam-config.json'
        ];

        const fileName = filePath.split('/').pop();

        return readOnlyFiles.includes(fileName);
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        const newFileBtn = this.container.querySelector('.file-action-btn.new-file');
        const refreshBtn = this.container.querySelector('.file-action-btn.refresh');

        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => this.createNewFile());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshFileTree());
        }

        const filesContent = this.container.querySelector('.files-content');
        if (filesContent) {
            filesContent.addEventListener('click', (e) => this.handleFileTreeClick(e));
            filesContent.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
            filesContent.addEventListener('dblclick', (e) => this.handleFileDoubleClick(e));
        }

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.createNewFile();
                        }
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
            const sessionId = window.ExamApp?.sessionId;
            if (!sessionId) {
                this.showEmptyState();
                return;
            }

            const response = await fetch(`/api/project/files?sessionId=${sessionId}`);
            const data = await response.json();

            if (data.success && data.files && data.files.length > 0) {
                this.projectType = data.projectType || 'vanilla';
                this.projectRoot = data.projectRoot || '';
                this.fileTree.clear();

                this.buildFileTree(data.files);
                this.renderFileTree();

                console.log('Project structure loaded:', this.projectType);
            } else {
                this.showEmptyState('Няма файлове в проекта');
            }

        } catch (error) {
            console.error('Failed to load project structure:', error);
            this.showEmptyState('Грешка при зареждане на файловете');
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
                        isOpen: false
                    });
                }

                if (index < pathParts.length - 1) {
                    currentLevel = currentLevel.get(part).children;
                }
            });
        });
    }

    /**
     * Render file tree in UI
     */
    renderFileTree() {
        const filesContent = this.container.querySelector('.files-content');
        if (!filesContent) return;

        const treeHTML = this.renderTreeLevel(this.fileTree);
        filesContent.innerHTML = `<div class="file-tree">${treeHTML}</div>`;
    }

    /**
     * Render tree level recursively
     * @param {Map} level - Current tree level
     * @param {number} depth - Current depth
     * @returns {string} HTML string
     */
    renderTreeLevel(level, depth = 0) {
        let html = '';

        level.forEach((item, key) => {
            const itemHTML = this.renderFileItem(item, depth);
            html += itemHTML;

            if (item.type === 'folder' && item.isOpen && item.children) {
                html += this.renderTreeLevel(item.children, depth + 1);
            }
        });

        return html;
    }

    /**
     * Render single file/folder item
     * @param {Object} item - File/folder object
     * @param {number} depth - Nesting depth
     * @returns {string} HTML string
     */
    renderFileItem(item, depth) {
        const indent = depth * 20;
        const isReadOnly = item.type === 'file' && this.isReadOnly(item.path);

        const itemElement = document.createElement('div');
        itemElement.className = `file-tree-item ${item.type} ${isReadOnly ? 'read-only' : ''}`;
        itemElement.setAttribute('data-path', item.path);
        itemElement.setAttribute('data-type', item.type);
        itemElement.style.paddingLeft = `${indent}px`;

        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';

        if (item.type === 'folder' && item.children && item.children.size > 0) {
            expandIcon.className += item.isOpen ? ' expanded' : ' collapsed';
            expandIcon.innerHTML = item.isOpen ? '▼' : '▶';
        } else {
            expandIcon.className += ' no-children';
        }

        const fileIcon = document.createElement('span');
        fileIcon.className = `file-icon ${this.getIconClass(item)}`;

        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = item.name;

        if (this.openFiles.has(item.path) && this.openFiles.get(item.path).modified) {
            fileName.classList.add('unsaved');
        }

        const fileActions = document.createElement('div');
        fileActions.className = 'file-actions';

        if (item.type === 'file' && !isReadOnly) {
            fileActions.innerHTML = `
                <button class="file-action rename" title="Rename" data-action="rename"></button>
                <button class="file-action duplicate" title="Duplicate" data-action="duplicate"></button>
                <button class="file-action delete" title="Delete" data-action="delete"></button>
            `;
        }

        const metadata = document.createElement('div');
        metadata.className = 'file-metadata';

        if (item.type === 'file') {
            metadata.innerHTML = `
                <span class="file-size">${this.formatFileSize(item.size)}</span>
                ${isReadOnly ? '<span class="read-only-badge">READ ONLY</span>' : ''}
            `;
        }

        return `
            <div class="file-tree-item ${item.type} ${isReadOnly ? 'read-only' : ''}" 
                 data-path="${item.path}" 
                 data-type="${item.type}" 
                 style="padding-left: ${indent}px">
                ${expandIcon.outerHTML}
                ${fileIcon.outerHTML}
                ${fileName.outerHTML}
                ${fileActions.outerHTML}
                ${metadata.outerHTML}
            </div>
        `;
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

        if (action) {
            e.stopPropagation();
            switch (action) {
                case 'rename':
                    this.renameFile(path);
                    break;
                case 'duplicate':
                    this.duplicateFile(path);
                    break;
                case 'delete':
                    this.deleteFile(path);
                    break;
            }
            return;
        }

        if (e.target.classList.contains('expand-icon') && type === 'folder') {
            this.toggleFolder(path);
        } else if (type === 'file') {
            this.openFile(path);
        }
    }

    /**
     * Handle context menu
     * @param {Event} e - Context menu event
     */
    handleContextMenu(e) {
        e.preventDefault();
    }

    /**
     * Handle double click
     * @param {Event} e - Double click event
     */
    handleFileDoubleClick(e) {
        const treeItem = e.target.closest('.file-tree-item');
        if (!treeItem) return;

        const type = treeItem.getAttribute('data-type');
        if (type === 'folder') {
            const path = treeItem.getAttribute('data-path');
            this.toggleFolder(path);
        }
    }

    /**
     * Toggle folder open/closed
     * @param {string} folderPath - Path to folder
     */
    toggleFolder(folderPath) {
        const item = this.findItemByPath(folderPath);
        if (item && item.type === 'folder') {
            item.isOpen = !item.isOpen;
            this.renderFileTree();
        }
    }

    /**
     * Open file in editor
     * @param {string} filePath - Path to file
     */
    async openFile(filePath) {
        try {
            if (this.isReadOnly(filePath)) {
                this.showNotification('Този файл е само за четене', 'warning');
            }

            const response = await fetch(`/api/project/file/${encodeURIComponent(filePath)}?sessionId=${window.ExamApp?.sessionId}`);
            const data = await response.json();

            if (data.success) {
                this.activeFile = filePath;
                this.openFiles.set(filePath, {
                    content: data.content,
                    modified: false
                });

                if (window.ExamApp?.editor) {
                    window.ExamApp.editor.setValue(data.content);

                    const language = this.getLanguageFromExtension(this.getFileExtension(filePath));
                    monaco.editor.setModelLanguage(window.ExamApp.editor.getModel(), language);

                    if (this.isReadOnly(filePath)) {
                        window.ExamApp.editor.updateOptions({ readOnly: true });
                    } else {
                        window.ExamApp.editor.updateOptions({ readOnly: false });
                    }
                }

                this.updateActiveFileIndicator();
            } else {
                throw new Error(data.error || 'Failed to load file');
            }

        } catch (error) {
            console.error('Failed to open file:', error);
            this.showNotification('Грешка при отваряне на файла', 'error');
        }
    }

    /**
     * Save current file
     */
    async saveFile() {
        if (!this.activeFile || !window.ExamApp?.editor) return;

        if (this.isReadOnly(this.activeFile)) {
            this.showNotification('Не можете да запазите read-only файл', 'error');
            return;
        }

        try {
            const content = window.ExamApp.editor.getValue();

            const response = await fetch(`/api/project/file/${encodeURIComponent(this.activeFile)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.ExamApp?.sessionId,
                    content: content
                })
            });

            const data = await response.json();
            if (data.success) {
                const fileData = this.openFiles.get(this.activeFile);
                if (fileData) {
                    fileData.modified = false;
                    fileData.content = content;
                }
                this.updateActiveFileIndicator();
                this.showNotification('Файлът е запазен', 'success');
            } else {
                throw new Error(data.error || 'Failed to save file');
            }

        } catch (error) {
            console.error('Save failed:', error);
            this.showNotification('Грешка при запазване', 'error');
        }
    }

    /**
     * Create new file
     */
    async createNewFile() {
        const fileName = prompt('Име на файла (например: src/utils.js):');
        if (!fileName) return;

        const folderPath = fileName.includes('/') ?
            fileName.substring(0, fileName.lastIndexOf('/') + 1) : '';

        if (!this.canCreateFile(folderPath)) {
            this.showNotification('Не можете да създавате файлове в тази папка', 'error');
            return;
        }

        try {
            const response = await fetch('/api/project/file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.ExamApp?.sessionId,
                    filename: fileName,
                    content: this.getDefaultContent(fileName)
                })
            });

            const data = await response.json();
            if (data.success) {
                await this.refreshFileTree();
                await this.openFile(fileName);
                this.showNotification('Файлът е създаден', 'success');
            } else {
                throw new Error(data.error || 'Failed to create file');
            }

        } catch (error) {
            console.error('Failed to create file:', error);
            this.showNotification('Грешка при създаване на файл', 'error');
        }
    }

    /**
     * Delete file
     * @param {string} filePath - Path to file
     */
    async deleteFile(filePath) {
        if (this.isReadOnly(filePath)) {
            this.showNotification('Не можете да изтриете системен файл', 'error');
            return;
        }

        if (!confirm(`Сигурни ли сте, че искате да изтриете "${filePath}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/project/file/${encodeURIComponent(filePath)}?sessionId=${window.ExamApp?.sessionId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                await this.loadProjectStructure();
                this.showNotification('Файлът е изтрит', 'success');

                if (this.activeFile === filePath) {
                    this.activeFile = null;
                    if (window.ExamApp?.editor) {
                        window.ExamApp.editor.setValue('');
                    }
                }
            } else {
                throw new Error(data.error || 'Failed to delete file');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            this.showNotification('Грешка при изтриване: ' + error.message, 'error');
        }
    }

    /**
     * Rename file
     * @param {string} oldPath - Current file path
     */
    async renameFile(oldPath) {
        if (this.isReadOnly(oldPath)) {
            this.showNotification('Не можете да преименувате системен файл', 'error');
            return;
        }

        const newName = prompt('Ново име на файла:', oldPath);
        if (!newName || newName === oldPath) return;

        const newFolderPath = newName.includes('/') ?
            newName.substring(0, newName.lastIndexOf('/') + 1) : '';

        if (!this.canCreateFile(newFolderPath)) {
            this.showNotification('Не можете да местите файлове в тази папка', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/project/file/${encodeURIComponent(oldPath)}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.ExamApp?.sessionId,
                    newPath: newName
                })
            });

            const data = await response.json();
            if (data.success) {
                await this.refreshFileTree();
                if (this.activeFile === oldPath) {
                    this.activeFile = newName;
                }
                this.showNotification('Файлът е преименуван', 'success');
            } else {
                throw new Error(data.error || 'Failed to rename file');
            }

        } catch (error) {
            console.error('Rename failed:', error);
            this.showNotification('Грешка при преименуване', 'error');
        }
    }

    /**
     * Duplicate file
     * @param {string} filePath - Path to file
     */
    async duplicateFile(filePath) {
        const pathParts = filePath.split('/');
        const fileName = pathParts.pop();
        const folderPath = pathParts.length > 0 ? pathParts.join('/') + '/' : '';

        const newName = prompt('Име на копието:', folderPath + 'copy_' + fileName);
        if (!newName) return;

        const newFolderPath = newName.includes('/') ?
            newName.substring(0, newName.lastIndexOf('/') + 1) : '';

        if (!this.canCreateFile(newFolderPath)) {
            this.showNotification('Не можете да създавате файлове в тази папка', 'error');
            return;
        }

        try {
            const getResponse = await fetch(`/api/project/file/${encodeURIComponent(filePath)}?sessionId=${window.ExamApp?.sessionId}`);
            const getData = await getResponse.json();

            if (!getData.success) {
                throw new Error('Failed to read original file');
            }

            const createResponse = await fetch('/api/project/file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.ExamApp?.sessionId,
                    filename: newName,
                    content: getData.content
                })
            });

            const createData = await createResponse.json();
            if (createData.success) {
                await this.refreshFileTree();
                this.showNotification('Файлът е дублиран', 'success');
            } else {
                throw new Error(createData.error || 'Failed to create duplicate');
            }

        } catch (error) {
            console.error('Duplicate failed:', error);
            this.showNotification('Грешка при дублиране', 'error');
        }
    }

    /**
     * Refresh file tree from server
     */
    async refreshFileTree() {
        await this.loadProjectStructure();
        this.showNotification('Файловете са обновени', 'info');
    }

    /**
     * Update active file indicator
     */
    updateActiveFileIndicator() {
        document.querySelectorAll('.file-tree-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-path') === this.activeFile) {
                item.classList.add('active');
            }
        });

        this.renderFileTree();
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

    showEmptyState(message = 'Няма файлове') {
        const filesContent = this.container.querySelector('.files-content');
        if (!filesContent) return;

        filesContent.innerHTML = `
            <div class="file-tree-empty">
                <div class="empty-folder-icon">📁</div>
                <div class="empty-title">Празен проект</div>
                <div class="empty-description">${message}</div>
                <div class="empty-actions">
                    <button class="empty-action-btn" onclick="window.ExamApp.fileExplorer.createNewFile()">
                        Създай файл
                    </button>
                </div>
            </div>
        `;
    }

    setLoading(loading) {
        this.isLoading = loading;
        const filesContent = this.container.querySelector('.files-content');
        if (filesContent && loading) {
            filesContent.innerHTML = '<div class="loading">Зареждане...</div>';
        }
    }

    showNotification(message, type = 'info') {
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

    if (window.ExamApp) {
        window.ExamApp.fileExplorer = fileExplorer;
    }

    return fileExplorer;
}

export function getFileExplorer() {
    return fileExplorer;
}