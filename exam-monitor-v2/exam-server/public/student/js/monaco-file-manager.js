import { prompt, showInfoDialog, confirm } from './dialogs.js';

export class MonacoFileManager {
    constructor(editorInstance) {
        this.editor = editorInstance;
        this.models = new Map();
        this.currentFile = null;
        this.tabs = new Map();
        this.fileTree = new Map();
        this.projectRoot = '';
        this.collapsedFolders = new Set();  // Track collapsed folders
        this.lastFileBeforePreview = null;  // Track last file before switching to preview

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
                // Check if folder should be collapsed
                const isCollapsed = this.collapsedFolders.has(item.path);
                const toggleIcon = hasChildren ? this.getChevronIcon(!isCollapsed) : '<span style="width:12px;display:inline-block"></span>';
                const childrenStyle = isCollapsed ? ' style="display: none;"' : '';

                // Folder with collapse/expand
                html += `
                    <div class="tree-item-wrapper" data-path="${item.path}">
                        <div class="tree-item ${itemClass}"
                             data-path="${item.path}"
                             data-type="${item.type}"
                             style="padding-left: ${indent * 20}px">
                            <span class="folder-toggle">${toggleIcon}</span>
                            <span class="tree-icon">${icon}</span>
                            <span class="tree-name">${name}</span>
                            <span class="tree-actions">
                                <button class="tree-action-btn new-folder-btn" data-path="${item.path}" title="New Folder">${this.getActionIcon('new-folder')}</button>
                                <button class="tree-action-btn new-file-btn" data-path="${item.path}" title="New File">${this.getActionIcon('new-file')}</button>
                                <button class="tree-action-btn delete-folder-btn" data-path="${item.path}" title="Delete Folder">${this.getActionIcon('delete')}</button>
                            </span>
                        </div>
                        ${hasChildren ? `<div class="folder-children"${childrenStyle}>${this.renderTreeLevel(item.children, indent + 1)}</div>` : ''}
                    </div>
                `;
            } else {
                // File
                html += `
                    <div class="tree-item ${itemClass}"
                         data-path="${item.path}"
                         data-type="${item.type}"
                         style="padding-left: ${indent * 20}px">
                        <span class="folder-toggle"><span style="width:12px;display:inline-block"></span></span>
                        <span class="tree-icon">${icon}</span>
                        <span class="tree-name">${name}</span>
                        <span class="tree-actions">
                            <button class="tree-action-btn rename-btn" data-path="${item.path}" title="Rename">${this.getActionIcon('rename')}</button>
                            <button class="tree-action-btn delete-btn" data-path="${item.path}" title="Delete">${this.getActionIcon('delete')}</button>
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

        // Attach new folder button listeners
        const newFolderButtons = this.fileTreeContainer.querySelectorAll('.new-folder-btn');
        newFolderButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const parentFolderPath = btn.getAttribute('data-path');
                await this.createSubFolder(parentFolderPath);
            });
        });

        // Attach delete folder button listeners
        const deleteFolderButtons = this.fileTreeContainer.querySelectorAll('.delete-folder-btn');
        deleteFolderButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const folderPath = btn.getAttribute('data-path');
                await this.deleteFolder(folderPath);
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
        const folderPath = folderItem.getAttribute('data-path');

        if (!children || !toggle) return;

        const isCollapsed = children.style.display === 'none';

        if (isCollapsed) {
            // Expand folder
            children.style.display = 'block';
            toggle.innerHTML = this.getChevronIcon(true);
            this.collapsedFolders.delete(folderPath);
        } else {
            // Collapse folder
            children.style.display = 'none';
            toggle.innerHTML = this.getChevronIcon(false);
            this.collapsedFolders.add(folderPath);
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
            this.showNotification('Error saving file', 'error');
            return false;
        }
    }

    markFileAsModified(path) {
        const tab = this.tabs.get(path);
        if (tab) {
            tab.classList.add('modified');
            tab.classList.remove('saved');
        }
    }

    unmarkFileAsModified(path) {
        const tab = this.tabs.get(path);
        if (tab) {
            tab.classList.remove('modified');
        }
    }

    markFileAsSaved(path) {
        const tab = this.tabs.get(path);
        if (tab) {
            tab.classList.remove('modified');
            tab.classList.add('saved');
            // Remove saved class after 2 seconds
            setTimeout(() => {
                tab.classList.remove('saved');
            }, 2000);
        }
    }

    async createNewFile(fileName) {
        if (!fileName) {
            fileName = await prompt('File name (e.g. app.js, style.css, index.html):');
            if (!fileName) return;
        }

        // Validate and sanitize filename
        fileName = this.sanitizeFileName(fileName);
        if (!fileName) {
            await showInfoDialog({
                title: 'Invalid Name',
                message: 'Please use only letters, numbers, dots and dashes.'
            });
            return;
        }

        // Check if file already exists
        if (this.models.has(fileName)) {
            await showInfoDialog({
                title: 'File Exists',
                message: `File "${fileName}" already exists!`
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
        const fileName = await prompt('File name (e.g. app.js, style.css):');
        if (!fileName) return;

        // Sanitize filename
        const sanitized = this.sanitizeFileName(fileName);
        if (!sanitized) {
            await showInfoDialog({
                title: 'Invalid Name',
                message: 'Please use only letters, numbers, dots and dashes.'
            });
            return;
        }

        // Build full path: folderPath/fileName
        const fullPath = folderPath ? `${folderPath}/${sanitized}` : sanitized;

        // Check if file already exists
        if (this.models.has(fullPath)) {
            await showInfoDialog({
                title: 'File Exists',
                message: `File "${fullPath}" already exists!`
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

        // Refresh file tree to show the new file
        await this.loadProjectStructure(window.ExamApp?.sessionId);
    }

    /**
     * Create a new folder
     */
    async createNewFolder() {
        const folderName = await prompt('Folder name (e.g. src, utils, components):');
        if (!folderName) return;

        // Sanitize folder name
        const sanitized = this.sanitizeFolderName(folderName);
        if (!sanitized) {
            await showInfoDialog({
                title: 'Invalid Name',
                message: 'Please use only letters, numbers and dashes.'
            });
            return;
        }

        console.log('Creating new folder:', sanitized);

        // Call API to create folder directly
        const response = await fetch('/api/project/folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: window.ExamApp?.sessionId,
                folderPath: sanitized
            })
        });

        const result = await response.json();

        if (!result.success) {
            await showInfoDialog({
                title: 'Error',
                message: `Error creating folder: ${result.error}`
            });
            return;
        }

        console.log('Folder created on server:', sanitized);

        // Refresh the file tree to show the new folder
        await this.loadProjectStructure(window.ExamApp?.sessionId);
    }

    /**
     * Create a subfolder inside an existing folder
     */
    async createSubFolder(parentFolderPath) {
        console.log('createSubFolder called with path:', parentFolderPath);

        const folderName = await prompt('Folder name (e.g. utils, helpers):');
        if (!folderName) return;

        console.log('User entered folder name:', folderName);

        // Remove file extension if user accidentally added one
        let cleanFolderName = folderName;
        if (cleanFolderName.includes('.')) {
            const lastDot = cleanFolderName.lastIndexOf('.');
            const extension = cleanFolderName.substring(lastDot);
            // Common file extensions to remove
            const fileExtensions = ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.txt', '.md'];
            if (fileExtensions.includes(extension.toLowerCase())) {
                cleanFolderName = cleanFolderName.substring(0, lastDot);
                console.warn('Removed file extension from folder name:', {
                    original: folderName,
                    cleaned: cleanFolderName
                });
            }
        }

        // Sanitize folder name
        const sanitized = this.sanitizeFolderName(cleanFolderName);
        if (!sanitized) {
            await showInfoDialog({
                title: 'Invalid Name',
                message: 'Please use only letters, numbers and dashes.'
            });
            return;
        }

        console.log('Sanitized folder name:', sanitized);

        // If parentFolderPath is a file path, extract the directory
        let actualParentPath = parentFolderPath;

        // Check if this looks like a file (has extension after last /)
        const lastSlash = parentFolderPath?.lastIndexOf('/') || -1;
        const afterLastSlash = lastSlash >= 0 ? parentFolderPath.substring(lastSlash + 1) : parentFolderPath;
        const hasExtension = afterLastSlash && afterLastSlash.includes('.');

        if (hasExtension) {
            // It's a file path, get the parent directory
            if (lastSlash > 0) {
                actualParentPath = parentFolderPath.substring(0, lastSlash);
            } else {
                actualParentPath = ''; // Root level
            }
            console.warn('File path detected, extracting parent folder:', {
                original: parentFolderPath,
                extracted: actualParentPath
            });
        }

        // Build full path: parentFolder/newFolder
        const fullFolderPath = actualParentPath ? `${actualParentPath}/${sanitized}` : sanitized;

        console.log('Creating subfolder:', fullFolderPath);

        // Call API to create folder directly
        const response = await fetch('/api/project/folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: window.ExamApp?.sessionId,
                folderPath: fullFolderPath
            })
        });

        const result = await response.json();

        if (!result.success) {
            await showInfoDialog({
                title: 'Error',
                message: `Error creating folder: ${result.error}`
            });
            return;
        }

        console.log('Folder created on server:', fullFolderPath);

        // Refresh the file tree to show the new folder
        await this.loadProjectStructure(window.ExamApp?.sessionId);
    }

    async deleteFile(path) {
        try {
            const confirmed = await confirm(`Are you sure you want to delete "${path}"?`);

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
                    title: 'Success',
                    message: `File "${path}" has been deleted.`
                });
            } else {
                await showInfoDialog({
                    title: 'Error',
                    message: 'Cannot delete file.'
                });
            }
        } catch (error) {
            console.error('Delete failed:', error);
            await showInfoDialog({
                title: 'Error',
                message: 'Error deleting file.'
            });
        }
    }

    async deleteFolder(folderPath) {
        try {
            const confirmed = await confirm(`Are you sure you want to delete folder "${folderPath}" and all its contents?`);

            if (!confirmed) return;

            // Delete from server
            const response = await fetch(`/api/project/folder/${encodeURIComponent(folderPath)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.ExamApp?.sessionId
                })
            });

            const result = await response.json();

            if (result.success) {
                // Close all files in this folder
                const modelsToClose = [];
                for (const [modelPath] of this.models) {
                    if (modelPath.startsWith(folderPath + '/') || modelPath === folderPath) {
                        modelsToClose.push(modelPath);
                    }
                }
                modelsToClose.forEach(p => this.closeFile(p));

                // Refresh file tree
                await this.loadProjectStructure(window.ExamApp?.sessionId);

                await showInfoDialog({
                    title: 'Success',
                    message: `Folder "${folderPath}" has been deleted.`
                });
            } else {
                await showInfoDialog({
                    title: 'Error',
                    message: 'Cannot delete folder.'
                });
            }
        } catch (error) {
            console.error('Delete folder failed:', error);
            await showInfoDialog({
                title: 'Error',
                message: 'Error deleting folder.'
            });
        }
    }

    async renameFile(oldPath) {
        try {
            const fileName = oldPath.split('/').pop();
            const newName = await prompt(`New name for "${fileName}":`, fileName);

            if (!newName || newName === fileName) return;

            const sanitized = this.sanitizeFileName(newName);
            if (!sanitized) {
                await showInfoDialog({
                    title: 'Invalid Name',
                    message: 'Please use only letters, numbers, dots and dashes.'
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
                    title: 'File Exists',
                    message: `File "${newPath}" already exists!`
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
                    title: 'Success',
                    message: `File renamed to "${sanitized}".`
                });
            } else {
                await showInfoDialog({
                    title: 'Error',
                    message: 'Cannot rename file.'
                });
            }
        } catch (error) {
            console.error('Rename failed:', error);
            await showInfoDialog({
                title: 'Error',
                message: 'Error renaming file.'
            });
        }
    }

    /**
     * Sanitize folder name - supports Cyrillic and other Unicode letters
     */
    sanitizeFolderName(folderName) {
        if (!folderName || typeof folderName !== 'string') return null;

        // Trim whitespace
        folderName = folderName.trim();
        if (!folderName) return null;

        // Remove dangerous characters but keep Unicode letters (including Cyrillic)
        // Allow: letters (any language), numbers, hyphens, underscores, spaces
        folderName = folderName.replace(/[<>:"/\\|?*.\x00-\x1f]/g, '');

        // Replace multiple spaces with single space
        folderName = folderName.replace(/\s+/g, ' ').trim();

        // Check if anything remains
        if (!folderName) return null;

        // Limit length
        if (folderName.length > 50) {
            folderName = folderName.substring(0, 50);
        }

        return folderName;
    }

    /**
     * Sanitize filename - supports Cyrillic and other Unicode letters
     */
    sanitizeFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') return null;

        // Trim whitespace
        fileName = fileName.trim();
        if (!fileName) return null;

        // Remove dangerous characters but keep Unicode letters (including Cyrillic)
        // Allow: letters (any language), numbers, dots, hyphens, underscores
        fileName = fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');

        // Replace spaces with underscores
        fileName = fileName.replace(/\s+/g, '_');

        // Remove leading/trailing dots and spaces
        fileName = fileName.replace(/^[.\s]+|[.\s]+$/g, '');

        // Check if anything remains
        if (!fileName) return null;

        // Ensure it has an extension
        if (!fileName.includes('.')) {
            fileName += '.js'; // Default to .js
        }

        // Check that the name part (before extension) is not empty
        const namePart = fileName.substring(0, fileName.lastIndexOf('.'));
        if (!namePart) return null;

        // Limit length
        if (fileName.length > 50) {
            const ext = fileName.substring(fileName.lastIndexOf('.'));
            fileName = fileName.substring(0, 50 - ext.length) + ext;
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
            return this.getFolderIcon();
        }

        return this.getFileIconSvg(item.extension);
    }

    /**
     * Get folder icon SVG (VS Code style)
     */
    getFolderIcon() {
        return `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 3C1.5 2.17 2.17 1.5 3 1.5H6.29L7.79 3H13C13.83 3 14.5 3.67 14.5 4.5V12C14.5 12.83 13.83 13.5 13 13.5H3C2.17 13.5 1.5 12.83 1.5 12V3Z" fill="#C09553"/>
            <path d="M1.5 5H14.5V12C14.5 12.83 13.83 13.5 13 13.5H3C2.17 13.5 1.5 12.83 1.5 12V5Z" fill="#CFA65C"/>
        </svg>`;
    }

    /**
     * Get file icon SVG based on extension (VS Code / Seti style)
     */
    getFileIconSvg(extension) {
        const icons = {
            // JavaScript
            'js': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#F7DF1E"/><text x="8" y="12" font-family="Arial" font-size="8" font-weight="bold" fill="#000" text-anchor="middle">JS</text></svg>`,
            'mjs': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#F7DF1E"/><text x="8" y="12" font-family="Arial" font-size="7" font-weight="bold" fill="#000" text-anchor="middle">MJS</text></svg>`,
            'jsx': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#61DAFB"/><text x="8" y="12" font-family="Arial" font-size="7" font-weight="bold" fill="#000" text-anchor="middle">JSX</text></svg>`,

            // TypeScript
            'ts': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#3178C6"/><text x="8" y="12" font-family="Arial" font-size="8" font-weight="bold" fill="#FFF" text-anchor="middle">TS</text></svg>`,
            'tsx': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#3178C6"/><text x="8" y="12" font-family="Arial" font-size="7" font-weight="bold" fill="#FFF" text-anchor="middle">TSX</text></svg>`,

            // HTML
            'html': `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 1L2.5 14L8 15.5L13.5 14L15 1H1Z" fill="#E44D26"/><path d="M8 2.5V14L12.5 12.8L13.8 2.5H8Z" fill="#F16529"/><path d="M4 5H12L11.8 7H5.5L5.7 9H11.5L11 12L8 13L5 12L4.8 10H6.5L6.6 11L8 11.4L9.4 11L9.6 9H4.3L4 5Z" fill="#FFF"/></svg>`,
            'htm': `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 1L2.5 14L8 15.5L13.5 14L15 1H1Z" fill="#E44D26"/><path d="M8 2.5V14L12.5 12.8L13.8 2.5H8Z" fill="#F16529"/><path d="M4 5H12L11.8 7H5.5L5.7 9H11.5L11 12L8 13L5 12L4.8 10H6.5L6.6 11L8 11.4L9.4 11L9.6 9H4.3L4 5Z" fill="#FFF"/></svg>`,

            // CSS
            'css': `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 1L2.5 14L8 15.5L13.5 14L15 1H1Z" fill="#1572B6"/><path d="M8 2.5V14L12.5 12.8L13.8 2.5H8Z" fill="#33A9DC"/><path d="M11 5H4L4.2 7H10.8L10.3 11L8 11.8L5.7 11L5.5 9H7L7.1 10L8 10.3L8.9 10L9 8H4.4L4 5H11Z" fill="#FFF"/></svg>`,
            'scss': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#CD6799"/><text x="8" y="11" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">SCSS</text></svg>`,
            'sass': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#CD6799"/><text x="8" y="11" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">SASS</text></svg>`,
            'less': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#1D365D"/><text x="8" y="11" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">LESS</text></svg>`,

            // JSON
            'json': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#F5A623"/><text x="8" y="9" font-family="Arial" font-size="9" font-weight="bold" fill="#000" text-anchor="middle">{}</text></svg>`,

            // Markdown
            'md': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#083FA1"/><text x="8" y="12" font-family="Arial" font-size="8" font-weight="bold" fill="#FFF" text-anchor="middle">M</text></svg>`,

            // Python
            'py': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#3776AB"/><path d="M5 3H11V6H8V7H11V13H5V10H8V9H5V3Z" fill="#FFD43B"/><circle cx="6.5" cy="4.5" r="0.8" fill="#3776AB"/><circle cx="9.5" cy="11.5" r="0.8" fill="#3776AB"/></svg>`,

            // Images
            'png': `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#8B5CF6"/><circle cx="5" cy="5" r="2" fill="#FFF" opacity="0.8"/><path d="M1 11L5 7L8 10L11 6L15 11V13C15 14.1 14.1 15 13 15H3C1.9 15 1 14.1 1 13V11Z" fill="#FFF" opacity="0.6"/></svg>`,
            'jpg': `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#8B5CF6"/><circle cx="5" cy="5" r="2" fill="#FFF" opacity="0.8"/><path d="M1 11L5 7L8 10L11 6L15 11V13C15 14.1 14.1 15 13 15H3C1.9 15 1 14.1 1 13V11Z" fill="#FFF" opacity="0.6"/></svg>`,
            'jpeg': `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#8B5CF6"/><circle cx="5" cy="5" r="2" fill="#FFF" opacity="0.8"/><path d="M1 11L5 7L8 10L11 6L15 11V13C15 14.1 14.1 15 13 15H3C1.9 15 1 14.1 1 13V11Z" fill="#FFF" opacity="0.6"/></svg>`,
            'gif': `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#10B981"/><circle cx="5" cy="5" r="2" fill="#FFF" opacity="0.8"/><path d="M1 11L5 7L8 10L11 6L15 11V13C15 14.1 14.1 15 13 15H3C1.9 15 1 14.1 1 13V11Z" fill="#FFF" opacity="0.6"/></svg>`,
            'svg': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#FFB13B"/><text x="8" y="11" font-family="Arial" font-size="6" font-weight="bold" fill="#000" text-anchor="middle">SVG</text></svg>`,
            'ico': `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#8B5CF6"/><rect x="4" y="4" width="8" height="8" rx="1" fill="#FFF" opacity="0.6"/></svg>`,

            // Config
            'gitignore': `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#F05032"/><circle cx="8" cy="8" r="3" fill="#FFF"/></svg>`,
            'env': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#4DB33D"/><text x="8" y="11" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">ENV</text></svg>`,

            // Handlebars
            'hbs': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#F0772B"/><text x="8" y="11" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">HBS</text></svg>`,

            // Text
            'txt': `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 1H10L13 4V14C13 14.55 12.55 15 12 15H3C2.45 15 2 14.55 2 14V2C2 1.45 2.45 1 3 1Z" fill="#90A4AE"/><path d="M10 1V4H13" fill="#78909C"/><path d="M4 7H11M4 9H11M4 11H8" stroke="#FFF" stroke-width="1"/></svg>`,

            // XML/YAML
            'xml': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#FF6600"/><text x="8" y="11" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">XML</text></svg>`,
            'yml': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#CB171E"/><text x="8" y="11" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">YML</text></svg>`,
            'yaml': `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#CB171E"/><text x="8" y="11" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF" text-anchor="middle">YAML</text></svg>`,

            // Archives
            'zip': `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 1H13C13.55 1 14 1.45 14 2V14C14 14.55 13.55 15 13 15H3C2.45 15 2 14.55 2 14V2C2 1.45 2.45 1 3 1Z" fill="#7B68EE"/><path d="M7 2H9V3H7V4H9V5H7V6H9V7H7V8H9V10H7V8" fill="#FFF"/></svg>`,
            'rar': `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 1H13C13.55 1 14 1.45 14 2V14C14 14.55 13.55 15 13 15H3C2.45 15 2 14.55 2 14V2C2 1.45 2.45 1 3 1Z" fill="#7B68EE"/><path d="M7 2H9V3H7V4H9V5H7V6H9V7H7V8H9V10H7V8" fill="#FFF"/></svg>`
        };

        // Default file icon
        const defaultIcon = `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 1H10L13 4V14C13 14.55 12.55 15 12 15H3C2.45 15 2 14.55 2 14V2C2 1.45 2.45 1 3 1Z" fill="#90A4AE"/><path d="M10 1V4H13" fill="#78909C"/></svg>`;

        return icons[extension] || defaultIcon;
    }

    /**
     * Get chevron icon for folder toggle
     */
    getChevronIcon(isExpanded) {
        if (isExpanded) {
            return `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`;
        }
        return `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`;
    }

    /**
     * Get action button icons
     */
    getActionIcon(type) {
        const icons = {
            'new-file': `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1H8L11 4V12C11 12.55 10.55 13 10 13H3C2.45 13 2 12.55 2 12V2C2 1.45 2.45 1 3 1Z" stroke="currentColor" fill="none" stroke-width="1"/><path d="M8 1V4H11" stroke="currentColor" fill="none" stroke-width="1"/><path d="M5 8H9M7 6V10" stroke="currentColor" stroke-width="1.2"/></svg>`,
            'new-folder': `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M1 3C1 2.45 1.45 2 2 2H5L6.5 3.5H12C12.55 3.5 13 3.95 13 4.5V11C13 11.55 12.55 12 12 12H2C1.45 12 1 11.55 1 11V3Z" stroke="currentColor" fill="none" stroke-width="1"/><path d="M5 8H9M7 6V10" stroke="currentColor" stroke-width="1.2"/></svg>`,
            'rename': `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M2 10L9 3L11 5L4 12H2V10Z" stroke="currentColor" fill="none" stroke-width="1"/><path d="M8 4L10 6" stroke="currentColor" stroke-width="1"/></svg>`,
            'delete': `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 4H11L10.2 12C10.15 12.55 9.7 13 9.15 13H4.85C4.3 13 3.85 12.55 3.8 12L3 4Z" stroke="currentColor" fill="none" stroke-width="1"/><path d="M2 4H12" stroke="currentColor" stroke-width="1"/><path d="M5 4V2.5C5 2.22 5.22 2 5.5 2H8.5C8.78 2 9 2.22 9 2.5V4" stroke="currentColor" fill="none" stroke-width="1"/><path d="M5.5 6V11M8.5 6V11" stroke="currentColor" stroke-width="0.8"/></svg>`
        };
        return icons[type] || '';
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

    /**
     * Open preview as a tab in the editor area
     */
    openPreviewTab() {
        const previewPath = '__preview__';

        // If preview tab already exists, just switch to it
        if (this.tabs.has(previewPath)) {
            this.switchToPreviewTab();
            return;
        }

        // Create preview tab
        const tab = document.createElement('div');
        tab.className = 'file-tab preview-tab';
        tab.setAttribute('data-path', previewPath);
        tab.innerHTML = `
            <span class="tab-icon">${this.getPreviewIcon()}</span>
            <span class="tab-name">Preview</span>
            <span class="tab-close" data-path="${previewPath}">×</span>
        `;

        this.tabsContainer.appendChild(tab);
        this.tabs.set(previewPath, tab);

        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                this.switchToPreviewTab();
            }
        });

        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closePreviewTab();
        });

        this.switchToPreviewTab();
    }

    /**
     * Switch to preview tab view
     */
    switchToPreviewTab() {
        const previewPath = '__preview__';

        // Remember the file that was open before switching to preview
        if (this.currentFile && this.currentFile !== previewPath) {
            this.lastFileBeforePreview = this.currentFile;
        }

        // Update active tab styling
        this.tabs.forEach((tab, tabPath) => {
            tab.classList.toggle('active', tabPath === previewPath);
        });

        // Hide Monaco editor, show preview container
        const editorContainer = document.getElementById('monaco-editor');
        let previewContainer = document.getElementById('preview-tab-container');

        if (!previewContainer) {
            // Create preview container if it doesn't exist
            previewContainer = document.createElement('div');
            previewContainer.id = 'preview-tab-container';
            previewContainer.className = 'preview-tab-container';
            previewContainer.innerHTML = `
                <iframe id="preview-tab-frame" class="preview-tab-frame" sandbox="allow-scripts allow-same-origin allow-modals"></iframe>
            `;
            editorContainer.parentNode.insertBefore(previewContainer, editorContainer.nextSibling);
        }

        editorContainer.style.display = 'none';
        previewContainer.style.display = 'flex';

        this.currentFile = previewPath;
        this.refreshPreviewContent();
    }

    /**
     * Refresh preview content - shows the currently open HTML file or index.html
     */
    async refreshPreviewContent() {
        const previewFrame = document.getElementById('preview-tab-frame');
        if (!previewFrame) return;

        const sessionId = window.ExamApp?.sessionId;
        if (!sessionId) {
            previewFrame.srcdoc = '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666;"><p>No session available</p></body></html>';
            return;
        }

        try {
            // First, check if the last opened file (before switching to preview) is an HTML file
            let htmlPath = null;

            // If we have a remembered file and it's an HTML file, use it
            if (this.lastFileBeforePreview && this.lastFileBeforePreview.endsWith('.html')) {
                htmlPath = this.lastFileBeforePreview;
            }

            // If not, find the last HTML tab that's open
            if (!htmlPath) {
                const openTabs = Array.from(this.tabs.keys()).filter(p => p !== '__preview__');
                for (let i = openTabs.length - 1; i >= 0; i--) {
                    if (openTabs[i].endsWith('.html')) {
                        htmlPath = openTabs[i];
                        break;
                    }
                }
            }

            // If no HTML tab is open, look for index.html in project
            if (!htmlPath) {
                const response = await fetch(`/api/project/files?sessionId=${sessionId}`);
                const result = await response.json();

                if (!result.success || !result.files) {
                    previewFrame.srcdoc = '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666;"><p>No project files found</p></body></html>';
                    return;
                }

                const htmlFile = result.files.find(f => f.name === 'index.html' || f.path === 'index.html') ||
                                 result.files.find(f => f.name.endsWith('.html'));

                if (!htmlFile) {
                    previewFrame.srcdoc = '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666;"><p>No HTML file found. Create an index.html file.</p></body></html>';
                    return;
                }

                htmlPath = htmlFile.path || htmlFile.name;
            }

            // Load the preview
            const encodedPath = htmlPath.split('/').map(part => encodeURIComponent(part)).join('/');
            const previewUrl = `/api/project/preview/${encodeURIComponent(sessionId)}/${encodedPath}`;
            previewFrame.src = previewUrl;

        } catch (error) {
            console.error('Preview error:', error);
            previewFrame.srcdoc = '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666;"><p>Error loading preview</p></body></html>';
        }
    }

    /**
     * Close preview tab
     */
    closePreviewTab() {
        const previewPath = '__preview__';

        const tab = this.tabs.get(previewPath);
        if (tab) {
            tab.remove();
            this.tabs.delete(previewPath);
        }

        // Hide preview container, show editor
        const editorContainer = document.getElementById('monaco-editor');
        const previewContainer = document.getElementById('preview-tab-container');

        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        if (editorContainer) {
            editorContainer.style.display = 'block';
        }

        // Switch to another open tab if available
        if (this.currentFile === previewPath) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchToFile(remainingTabs[remainingTabs.length - 1]);
            } else {
                this.currentFile = null;
            }
        }
    }

    /**
     * Override switchToFile to handle preview tab
     */
    switchToFile(path) {
        // If switching away from preview, hide preview container
        if (this.currentFile === '__preview__' && path !== '__preview__') {
            const editorContainer = document.getElementById('monaco-editor');
            const previewContainer = document.getElementById('preview-tab-container');

            if (previewContainer) {
                previewContainer.style.display = 'none';
            }
            if (editorContainer) {
                editorContainer.style.display = 'block';
            }
        }

        const model = this.models.get(path);
        if (model && this.editor) {
            this.editor.setModel(model);
            this.currentFile = path;
            this.updateActiveTab(path);
            this.editor.focus();
        }
    }

    /**
     * Get preview icon SVG
     */
    getPreviewIcon() {
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3C4 3 1 8 1 8s3 5 7 5 7-5 7-5-3-5-7-5zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" stroke="currentColor" stroke-width="1" fill="none"/>
            <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
        </svg>`;
    }
}