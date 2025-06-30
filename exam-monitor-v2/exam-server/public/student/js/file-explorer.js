import { prompt, confirm } from './dialogs.js';

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

    canCreateFile(path) {
        const allowedPaths = ['src/', 'components/', 'utils/', 'styles/', 'public/'];

        if (!path || path === '') return true;

        return allowedPaths.some(allowed => path.startsWith(allowed));
    }

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

    async loadProjectStructure() {
        if (this.isLoading) return;

        this.setLoading(true);

        try {
            const response = await fetch(`/api/project/files?sessionId=${window.ExamApp?.sessionId}`);
            const data = await response.json();

            if (data.success && data.files) {
                this.projectType = data.projectType || 'vanilla';
                this.projectRoot = data.projectRoot || '';
                this.buildFileTree(data.files);
                this.renderFileTree();
            } else {
                this.showEmptyState('Няма проект. Създайте нов файл за да започнете.');
            }

        } catch (error) {
            console.error('Failed to load project structure:', error);
            this.showEmptyState('Грешка при зареждане на проекта');
        } finally {
            this.setLoading(false);
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

    renderFileTree() {
        const filesContent = this.container.querySelector('.files-content');
        if (!filesContent) return;

        const treeHTML = this.renderTreeLevel(this.fileTree);
        filesContent.innerHTML = `<div class="file-tree">${treeHTML}</div>`;
    }

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
        } else if (item.type === 'folder') {
            expandIcon.innerHTML = '▶';
            expandIcon.className += ' empty';
        }

        const icon = document.createElement('span');
        icon.className = `file-icon ${this.getIconClass(item)}`;

        const name = document.createElement('span');
        name.className = 'file-name';
        name.textContent = item.name;

        if (isReadOnly) {
            const readOnlyBadge = document.createElement('span');
            readOnlyBadge.className = 'read-only-badge';
            readOnlyBadge.textContent = 'read-only';
            name.appendChild(readOnlyBadge);
        }

        if (item.type === 'folder') {
            itemElement.appendChild(expandIcon);
        }
        itemElement.appendChild(icon);
        itemElement.appendChild(name);

        return itemElement.outerHTML;
    }

    async handleFileTreeClick(e) {
        const item = e.target.closest('.file-tree-item');
        if (!item) return;

        const path = item.getAttribute('data-path');
        const type = item.getAttribute('data-type');

        if (type === 'folder') {
            this.toggleFolder(path);
        } else if (type === 'file') {
            await this.openFile(path);
        }
    }

    async handleContextMenu(e) {
        e.preventDefault();

        const item = e.target.closest('.file-tree-item');
        if (!item) return;

        const path = item.getAttribute('data-path');
        const type = item.getAttribute('data-type');

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;

        const actions = [];

        if (type === 'file' && !this.isReadOnly(path)) {
            actions.push(
                { label: 'Изтрий', action: () => this.deleteFile(path) },
                { label: 'Преименувай', action: () => this.renameFile(path) },
                { label: 'Дублирай', action: () => this.duplicateFile(path) }
            );
        }

        if (type === 'folder') {
            actions.push(
                { label: 'Нов файл', action: () => this.createNewFileInFolder(path) }
            );
        }

        actions.forEach(action => {
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.textContent = action.label;
            item.onclick = () => {
                action.action();
                menu.remove();
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        const removeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 0);
    }

    async handleFileDoubleClick(e) {
        const item = e.target.closest('.file-tree-item');
        if (!item) return;

        const type = item.getAttribute('data-type');
        if (type === 'folder') {
            e.preventDefault();
        }
    }

    toggleFolder(path) {
        const folder = this.findItemByPath(path);
        if (folder && folder.type === 'folder') {
            folder.isOpen = !folder.isOpen;
            this.renderFileTree();
        }
    }

    async openFile(filePath) {
        if (this.activeFile === filePath) return;

        if (this.isReadOnly(filePath) && !await confirm('Този файл е read-only. Сигурни ли сте, че искате да го отворите?')) {
            return;
        }

        try {
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
                    const ext = this.getFileExtension(filePath);
                    const language = this.getLanguageFromExtension(ext);
                    window.monaco.editor.setModelLanguage(window.ExamApp.editor.getModel(), language);
                }

                this.updateActiveFileIndicator();
                this.showNotification(`Отворен файл: ${filePath}`, 'success');
            } else {
                throw new Error(data.error || 'Failed to load file');
            }

        } catch (error) {
            console.error('Failed to open file:', error);
            this.showNotification('Грешка при отваряне на файла', 'error');
        }
    }

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

    async createNewFile() {
        const fileName = await prompt('Име на файла (например: src/utils.js):');
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

    async deleteFile(filePath) {
        if (this.isReadOnly(filePath)) {
            this.showNotification('Не можете да изтриете системен файл', 'error');
            return;
        }

        if (!await confirm(`Сигурни ли сте, че искате да изтриете "${filePath}"?`)) {
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

    async renameFile(oldPath) {
        if (this.isReadOnly(oldPath)) {
            this.showNotification('Не можете да преименувате системен файл', 'error');
            return;
        }

        const newName = await prompt('Ново име на файла:', oldPath);
        if (!newName || newName === oldPath) return;

        const newFolderPath = newName.includes('/') ?
            newName.substring(0, newName.lastIndexOf('/') + 1) : '';

        if (!this.canCreateFile(newFolderPath)) {
            this.showNotification('Не можете да преместите файла в тази папка', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/project/file/${encodeURIComponent(oldPath)}?sessionId=${window.ExamApp?.sessionId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const createResponse = await fetch('/api/project/file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: window.ExamApp?.sessionId,
                        filename: newName,
                        content: this.openFiles.get(oldPath)?.content || ''
                    })
                });

                if (createResponse.ok) {
                    await this.loadProjectStructure();
                    this.showNotification('Файлът е преименуван', 'success');

                    if (this.activeFile === oldPath) {
                        await this.openFile(newName);
                    }
                }
            }
        } catch (error) {
            console.error('Rename failed:', error);
            this.showNotification('Грешка при преименуване', 'error');
        }
    }

    async duplicateFile(filePath) {
        if (this.isReadOnly(filePath)) {
            this.showNotification('Не можете да дублирате системен файл', 'error');
            return;
        }

        const ext = this.getFileExtension(filePath);
        const baseName = filePath.replace(`.${ext}`, '');
        const newName = await prompt('Име на копието:', `${baseName}-copy.${ext}`);

        if (!newName || newName === filePath) return;

        try {
            const fileContent = this.openFiles.get(filePath)?.content || '';

            const response = await fetch('/api/project/file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.ExamApp?.sessionId,
                    filename: newName,
                    content: fileContent
                })
            });

            const data = await response.json();
            if (data.success) {
                await this.refreshFileTree();
                this.showNotification('Файлът е дублиран', 'success');
            } else {
                throw new Error(data.error || 'Failed to duplicate file');
            }

        } catch (error) {
            console.error('Duplicate failed:', error);
            this.showNotification('Грешка при дублиране', 'error');
        }
    }

    async createNewFileInFolder(folderPath) {
        const fileName = await prompt(`Създай файл в ${folderPath}/:`);
        if (!fileName) return;

        const fullPath = `${folderPath}/${fileName}`;
        await this.createNewFile(fullPath);
    }

    async refreshFileTree() {
        await this.loadProjectStructure();
    }

    updateActiveFileIndicator() {
        document.querySelectorAll('.file-tree-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-path') === this.activeFile) {
                item.classList.add('active');
            }
        });
    }

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