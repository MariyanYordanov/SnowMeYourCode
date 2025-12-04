import { prompt, showInfoDialog, confirm } from './dialogs.js';

export class MonacoFileManager {
    constructor(editorInstance) {
        this.editor = editorInstance;
        this.models = new Map();
        this.currentFile = null;
        this.tabs = new Map();
        this.fileTree = new Map();
        this.projectRoot = '';

        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.tabsContainer = document.getElementById('file-tabs-container');
        this.fileTreeContainer = document.getElementById('file-tree');
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    this.saveCurrentFile();
                } else if (e.key === 'w') {
                    e.preventDefault();
                    this.closeCurrentFile();
                }
            }
        });
    }

    async loadProjectStructure(sessionId) {
        try {
            const response = await fetch(`/api/project/files?sessionId=${sessionId}`);
            const data = await response.json();

            if (data.success && data.files) {
                this.projectRoot = data.projectRoot || '';
                this.buildFileTree(data.files);
                this.renderFileTree();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load project:', error);
            return false;
        }
    }

    buildFileTree(files) {
        this.fileTree.clear();

        files.forEach(file => {
            const pathParts = file.path.split('/');
            let currentLevel = this.fileTree;

            pathParts.forEach((part, index) => {
                if (!currentLevel.has(part)) {
                    const isFile = index === pathParts.length - 1 && file.type === 'file';
                    currentLevel.set(part, {
                        name: part,
                        type: isFile ? 'file' : 'folder',
                        path: pathParts.slice(0, index + 1).join('/'),
                        children: isFile ? null : new Map(),
                        extension: isFile ? this.getFileExtension(part) : null
                    });
                }

                if (index < pathParts.length - 1) {
                    currentLevel = currentLevel.get(part).children;
                }
            });
        });
    }

    renderFileTree() {
        if (!this.fileTreeContainer) return;

        const treeHTML = this.renderTreeLevel(this.fileTree);
        this.fileTreeContainer.innerHTML = `<div class="file-tree-content">${treeHTML}</div>`;

        this.attachTreeEventListeners();
    }

    renderTreeLevel(level, indent = 0) {
        let html = '';

        for (const [name, item] of level) {
            const icon = this.getIconForItem(item);
            const itemClass = item.type === 'file' ? 'file-item' : 'folder-item';
            const hasChildren = item.type === 'folder' && item.children && item.children.size > 0;

            if (item.type === 'folder') {
                // Folder with collapse/expand
                html += `
                    <div class="tree-item-wrapper" data-path="${item.path}">
                        <div class="tree-item ${itemClass}"
                             data-path="${item.path}"
                             data-type="${item.type}"
                             style="padding-left: ${indent * 20}px">
                            <span class="folder-toggle">${hasChildren ? '▼' : '▶'}</span>
                            <span class="tree-icon">${icon}</span>
                            <span class="tree-name">${name}</span>
                            <span class="tree-actions">
                                <button class="tree-action-btn new-file-btn" data-path="${item.path}" title="Нов файл">+</button>
                            </span>
                        </div>
                        ${hasChildren ? `<div class="folder-children">${this.renderTreeLevel(item.children, indent + 1)}</div>` : ''}
                    </div>
                `;
            } else {
                // File
                html += `
                    <div class="tree-item ${itemClass}"
                         data-path="${item.path}"
                         data-type="${item.type}"
                         style="padding-left: ${indent * 20}px">
                        <span class="tree-icon">${icon}</span>
                        <span class="tree-name">${name}</span>
                        <span class="tree-actions">
                            <button class="tree-action-btn rename-btn" data-path="${item.path}" title="Преименуване">✏️</button>
                            <button class="tree-action-btn delete-btn" data-path="${item.path}" title="Изтриване">🗑️</button>
                        </span>
                    </div>
                `;
            }
        }

        return html;
    }

    attachTreeEventListeners() {
        const items = this.fileTreeContainer.querySelectorAll('.tree-item');

        items.forEach(item => {
            item.addEventListener('click', async (e) => {
                // Check if clicking on folder toggle
                if (e.target.classList.contains('folder-toggle')) {
                    e.stopPropagation();
                    this.toggleFolder(item);
                    return;
                }

                // Ignore clicks on action buttons
                if (e.target.closest('.tree-action-btn')) {
                    return;
                }

                const path = item.getAttribute('data-path');
                const type = item.getAttribute('data-type');

                if (type === 'file') {
                    await this.openFile(path);
                } else if (type === 'folder') {
                    // Toggle folder on click
                    this.toggleFolder(item);
                }
            });
        });

        // Attach delete button listeners
        const deleteButtons = this.fileTreeContainer.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const path = btn.getAttribute('data-path');
                await this.deleteFile(path);
            });
        });

        // Attach rename button listeners
        const renameButtons = this.fileTreeContainer.querySelectorAll('.rename-btn');
        renameButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const path = btn.getAttribute('data-path');
                await this.renameFile(path);
            });
        });

        // Attach new file button listeners
        const newFileButtons = this.fileTreeContainer.querySelectorAll('.new-file-btn');
        newFileButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const folderPath = btn.getAttribute('data-path');
                await this.createFileInFolder(folderPath);
            });
        });
    }

    /**
     * Toggle folder collapse/expand
     */
    toggleFolder(folderItem) {
        const wrapper = folderItem.closest('.tree-item-wrapper');
        if (!wrapper) return;

        const children = wrapper.querySelector('.folder-children');
        const toggle = folderItem.querySelector('.folder-toggle');

        if (!children || !toggle) return;

        const isCollapsed = children.style.display === 'none';

        if (isCollapsed) {
            children.style.display = 'block';
            toggle.textContent = '▼';
        } else {
            children.style.display = 'none';
            toggle.textContent = '▶';
        }
    }

    async openFile(path) {
        try {
            if (this.models.has(path)) {
                this.switchToFile(path);
                return;
            }

            const response = await fetch(`/api/project/file/${encodeURIComponent(path)}?sessionId=${window.ExamApp?.sessionId}`);
            const data = await response.json();

            if (data.success && data.content !== undefined) {
                this.createFileModel(path, data.content);
                this.switchToFile(path);
                this.addTab(path);
            }
        } catch (error) {
            console.error('Failed to open file:', error);
        }
    }

    createFileModel(path, content) {
        const language = this.detectLanguage(path);
        const uri = monaco.Uri.parse(`file:///${path}`);
        const model = monaco.editor.createModel(content, language, uri);

        this.models.set(path, model);

        model.onDidChangeContent(() => {
            this.markFileAsModified(path);
        });
    }

    switchToFile(path) {
        const model = this.models.get(path);
        if (model && this.editor) {
            this.editor.setModel(model);
            this.currentFile = path;
            this.updateActiveTab(path);
            this.editor.focus();
        }
    }

    addTab(path) {
        if (this.tabs.has(path)) {
            this.updateActiveTab(path);
            return;
        }

        const fileName = path.split('/').pop();
        const icon = this.getFileIcon(path);

        const tab = document.createElement('div');
        tab.className = 'file-tab';
        tab.setAttribute('data-path', path);
        tab.innerHTML = `
            <span class="tab-icon">${icon}</span>
            <span class="tab-name">${fileName}</span>
            <span class="tab-close" data-path="${path}">×</span>
        `;

        this.tabsContainer.appendChild(tab);
        this.tabs.set(path, tab);

        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                this.switchToFile(path);
            }
        });

        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeFile(path);
        });

        this.updateActiveTab(path);
    }

    updateActiveTab(path) {
        this.tabs.forEach((tab, tabPath) => {
            tab.classList.toggle('active', tabPath === path);
        });
    }

    closeFile(path) {
        const model = this.models.get(path);
        if (model) {
            model.dispose();
            this.models.delete(path);
        }

        const tab = this.tabs.get(path);
        if (tab) {
            tab.remove();
            this.tabs.delete(path);
        }

        if (this.currentFile === path) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchToFile(remainingTabs[remainingTabs.length - 1]);
            } else {
                this.currentFile = null;
                this.editor.setModel(null);
            }
        }
    }

    closeCurrentFile() {
        if (this.currentFile) {
            this.closeFile(this.currentFile);
        }
    }

    async saveCurrentFile() {
        if (!this.currentFile || !this.editor) return false;

        try {
            const content = this.editor.getValue();
            const filename = encodeURIComponent(this.currentFile);

            const response = await fetch(`/api/project/file/${filename}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.ExamApp?.sessionId,
                    content: content
                })
            });

            const result = await response.json();

            if (result.success) {
                this.unmarkFileAsModified(this.currentFile);

                // Notify preview manager of file change
                if (window.ExamApp?.previewManager) {
                    window.ExamApp.previewManager.onFileChanged(this.currentFile);
                }

                return true;
            }

            return false;
        } catch (error) {
            console.error('Save failed:', error);
            this.showNotification('Грешка при запазване', 'error');
            return false;
        }
    }

    markFileAsModified(path) {
        const tab = this.tabs.get(path);
        if (tab) {
            tab.classList.add('modified');
        }
    }

    unmarkFileAsModified(path) {
        const tab = this.tabs.get(path);
        if (tab) {
            tab.classList.remove('modified');
        }
    }

    async createNewFile(fileName) {
        if (!fileName) {
            fileName = await prompt('Име на файл (напр. app.js, style.css, index.html):');
            if (!fileName) return;
        }

        // Validate and sanitize filename
        fileName = this.sanitizeFileName(fileName);
        if (!fileName) {
            await showInfoDialog({
                title: 'Невалидно име',
                message: 'Моля използвайте само букви, цифри, точки и тирета.'
            });
            return;
        }

        // Check if file already exists
        if (this.models.has(fileName)) {
            await showInfoDialog({
                title: 'Файлът съществува',
                message: `Файл "${fileName}" вече съществува!`
            });
            return;
        }

        console.log('Creating new file:', fileName);

        const content = this.getTemplateForFile(fileName);
        this.createFileModel(fileName, content);
        this.switchToFile(fileName);
        this.addTab(fileName);

        await this.saveCurrentFile();
    }

    /**
     * Create a new file inside a specific folder
     */
    async createFileInFolder(folderPath) {
        const fileName = await prompt('Име на файл (напр. app.js, style.css):');
        if (!fileName) return;

        // Sanitize filename
        const sanitized = this.sanitizeFileName(fileName);
        if (!sanitized) {
            await showInfoDialog({
                title: 'Невалидно име',
                message: 'Моля използвайте само букви, цифри, точки и тирета.'
            });
            return;
        }

        // Build full path: folderPath/fileName
        const fullPath = folderPath ? `${folderPath}/${sanitized}` : sanitized;

        // Check if file already exists
        if (this.models.has(fullPath)) {
            await showInfoDialog({
                title: 'Файлът съществува',
                message: `Файл "${fullPath}" вече съществува!`
            });
            return;
        }

        console.log('Creating new file in folder:', fullPath);

        // Create and save file
        const content = this.getTemplateForFile(sanitized);
        this.createFileModel(fullPath, content);
        this.switchToFile(fullPath);
        this.addTab(fullPath);
        await this.saveCurrentFile();
    }

    /**
     * Create a new folder
     */
    async createNewFolder() {
        const folderName = await prompt('Име на папка (напр. src, utils, components):');
        if (!folderName) return;

        // Sanitize folder name
        const sanitized = this.sanitizeFileName(folderName);
        if (!sanitized) {
            await showInfoDialog({
                title: 'Невалидно име',
                message: 'Моля използвайте само букви, цифри и тирета.'
            });
            return;
        }

        // Create a placeholder file in the folder to ensure it exists
        // (Folders are virtual in this system, defined by file paths)
        const placeholderPath = `${sanitized}/.gitkeep`;

        if (this.models.has(placeholderPath)) {
            await showInfoDialog({
                title: 'Папката съществува',
                message: `Папка "${sanitized}" вече съществува!`
            });
            return;
        }

        console.log('Creating new folder:', sanitized);

        // Create placeholder file to establish the folder
        this.createFileModel(placeholderPath, '');
        await this.saveFile(placeholderPath, '');

        // Refresh the file tree to show the new folder
        await this.loadProjectFiles();
    }

    async deleteFile(path) {
        try {
            const confirmed = await confirm(`Сигурни ли сте, че искате да изтриете "${path}"?`);

            if (!confirmed) return;

            // Delete from server
            const response = await fetch(`/api/project/file/${encodeURIComponent(path)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.ExamApp?.sessionId
                })
            });

            const result = await response.json();

            if (result.success) {
                // Close file if open
                this.closeFile(path);

                // Remove from file tree
                await this.loadProjectStructure(window.ExamApp?.sessionId);

                await showInfoDialog({
                    title: 'Успех',
                    message: `Файлът "${path}" е изтрит.`
                });
            } else {
                await showInfoDialog({
                    title: 'Грешка',
                    message: 'Не може да се изтрие файлът.'
                });
            }
        } catch (error) {
            console.error('Delete failed:', error);
            await showInfoDialog({
                title: 'Грешка',
                message: 'Грешка при изтриване на файл.'
            });
        }
    }

    async renameFile(oldPath) {
        try {
            const fileName = oldPath.split('/').pop();
            const newName = await prompt(`Ново име за "${fileName}":`, fileName);

            if (!newName || newName === fileName) return;

            const sanitized = this.sanitizeFileName(newName);
            if (!sanitized) {
                await showInfoDialog({
                    title: 'Невалидно име',
                    message: 'Моля използвайте само букви, цифри, точки и тирета.'
                });
                return;
            }

            // Build new path
            const pathParts = oldPath.split('/');
            pathParts[pathParts.length - 1] = sanitized;
            const newPath = pathParts.join('/');

            // Check if new name already exists
            if (this.models.has(newPath)) {
                await showInfoDialog({
                    title: 'Файлът съществува',
                    message: `Файл "${newPath}" вече съществува!`
                });
                return;
            }

            // Rename on server
            const response = await fetch(`/api/project/file/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.ExamApp?.sessionId,
                    oldPath: oldPath,
                    newPath: newPath
                })
            });

            const result = await response.json();

            if (result.success) {
                // Update local state
                const model = this.models.get(oldPath);
                if (model) {
                    this.models.delete(oldPath);
                    this.models.set(newPath, model);
                }

                const tab = this.tabs.get(oldPath);
                if (tab) {
                    this.tabs.delete(oldPath);
                    this.tabs.set(newPath, tab);
                    tab.setAttribute('data-path', newPath);
                    tab.querySelector('.tab-name').textContent = sanitized;
                }

                if (this.currentFile === oldPath) {
                    this.currentFile = newPath;
                }

                // Reload file tree
                await this.loadProjectStructure(window.ExamApp?.sessionId);

                await showInfoDialog({
                    title: 'Успех',
                    message: `Файлът е преименуван на "${sanitized}".`
                });
            } else {
                await showInfoDialog({
                    title: 'Грешка',
                    message: 'Не може да се преименува файлът.'
                });
            }
        } catch (error) {
            console.error('Rename failed:', error);
            await showInfoDialog({
                title: 'Грешка',
                message: 'Грешка при преименуване на файл.'
            });
        }
    }

    /**
     * Sanitize filename
     */
    sanitizeFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') return null;
        
        // Remove non-ASCII characters and invalid chars
        fileName = fileName
            .trim()
            .replace(/[^\w\.-]/g, '') // Only allow word chars, dots, hyphens
            .toLowerCase();
        
        // Ensure it has an extension
        if (!fileName.includes('.')) {
            fileName += '.js'; // Default to .js
        }
        
        // Limit length
        if (fileName.length > 50) {
            fileName = fileName.substring(0, 47) + fileName.substring(fileName.lastIndexOf('.'));
        }
        
        return fileName;
    }

    detectLanguage(path) {
        const ext = this.getFileExtension(path);
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'json': 'json',
            'md': 'markdown',
            'xml': 'xml',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'kt': 'kotlin',
            'swift': 'swift',
            'sql': 'sql',
            'yaml': 'yaml',
            'yml': 'yaml'
        };

        return languageMap[ext] || 'plaintext';
    }

    getFileExtension(fileName) {
        const parts = fileName.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    getIconForItem(item) {
        if (item.type === 'folder') {
            return '<span style="color: #f59e0b;">📁</span>';
        }

        // VS Code-style file icons based on extension
        const iconMap = {
            // JavaScript / TypeScript
            'js': '<span style="color: #f7df1e;">JS</span>',
            'mjs': '<span style="color: #f7df1e;">JS</span>',
            'jsx': '<span style="color: #61dafb;">JSX</span>',
            'ts': '<span style="color: #3178c6;">TS</span>',
            'tsx': '<span style="color: #3178c6;">TSX</span>',

            // Web
            'html': '<span style="color: #e34c26;">HTML</span>',
            'htm': '<span style="color: #e34c26;">HTML</span>',
            'css': '<span style="color: #563d7c;">CSS</span>',
            'scss': '<span style="color: #cc6699;">SCSS</span>',
            'sass': '<span style="color: #cc6699;">SASS</span>',
            'less': '<span style="color: #1d365d;">LESS</span>',

            // Data formats
            'json': '<span style="color: #f7df1e;">{ }</span>',
            'xml': '<span style="color: #f57842;">XML</span>',
            'yml': '<span style="color: #cb171e;">YML</span>',
            'yaml': '<span style="color: #cb171e;">YAML</span>',

            // Python
            'py': '<span style="color: #3776ab;">PY</span>',

            // Markdown & Docs
            'md': '<span style="color: #083fa1;">MD</span>',
            'txt': '<span style="color: #6c757d;">TXT</span>',
            'pdf': '<span style="color: #dc3545;">PDF</span>',

            // Images
            'png': '<span style="color: #8b4513;">PNG</span>',
            'jpg': '<span style="color: #8b4513;">JPG</span>',
            'jpeg': '<span style="color: #8b4513;">JPEG</span>',
            'gif': '<span style="color: #8b4513;">GIF</span>',
            'svg': '<span style="color: #ffb13b;">SVG</span>',
            'ico': '<span style="color: #8b4513;">ICO</span>',

            // Config files
            'gitignore': '<span style="color: #f05032;">GIT</span>',
            'gitkeep': '<span style="color: #6c757d;">·</span>',
            'env': '<span style="color: #ecd53f;">ENV</span>',
            'lock': '<span style="color: #6c757d;">🔒</span>',

            // Other
            'zip': '<span style="color: #6c757d;">ZIP</span>',
            'rar': '<span style="color: #6c757d;">RAR</span>'
        };

        return iconMap[item.extension] || '<span style="color: #6c757d;">📄</span>';
    }

    getFileIcon(path) {
        const ext = this.getFileExtension(path);
        return this.getIconForItem({ type: 'file', extension: ext });
    }

    getTemplateForFile(fileName) {
        const ext = this.getFileExtension(fileName);
        const templates = {
            'html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>',
            'css': '/* Styles */\n',
            'js': '// JavaScript\n',
            'json': '{\n  \n}'
        };

        return templates[ext] || '';
    }

    showNotification(message, type = 'info') {
        if (window.ExamApp?.showNotification) {
            window.ExamApp.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    getAllOpenFiles() {
        return Array.from(this.models.keys());
    }

    getFileContent(path) {
        const model = this.models.get(path);
        return model ? model.getValue() : null;
    }

    hasUnsavedChanges() {
        return Array.from(this.tabs.values()).some(tab => tab.classList.contains('modified'));
    }

    closeAllFiles() {
        const files = Array.from(this.models.keys());
        files.forEach(path => this.closeFile(path));
    }

    disposeAll() {
        this.closeAllFiles();
        this.models.clear();
        this.tabs.clear();
        this.fileTree.clear();
    }
}