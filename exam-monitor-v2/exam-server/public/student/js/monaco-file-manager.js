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

            html += `
                <div class="tree-item ${itemClass}" 
                     data-path="${item.path}" 
                     data-type="${item.type}"
                     style="padding-left: ${indent * 20}px">
                    <span class="tree-icon">${icon}</span>
                    <span class="tree-name">${name}</span>
                </div>
            `;

            if (item.type === 'folder' && item.children) {
                html += this.renderTreeLevel(item.children, indent + 1);
            }
        }

        return html;
    }

    attachTreeEventListeners() {
        const items = this.fileTreeContainer.querySelectorAll('.tree-item');

        items.forEach(item => {
            item.addEventListener('click', async (e) => {
                const path = item.getAttribute('data-path');
                const type = item.getAttribute('data-type');

                if (type === 'file') {
                    await this.openFile(path);
                }
            });
        });
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
                this.showNotification('Файлът е запазен', 'success');
                
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
            fileName = prompt('File name (e.g. app.js, style.css, index.html):');
            if (!fileName) return;
        }

        // Validate and sanitize filename
        fileName = this.sanitizeFileName(fileName);
        if (!fileName) {
            alert('Invalid file name. Please use only letters, numbers, dots, and hyphens.');
            return;
        }

        // Check if file already exists
        if (this.models.has(fileName)) {
            alert(`File "${fileName}" already exists!`);
            return;
        }

        console.log('📁 Creating new file:', fileName);

        const content = this.getTemplateForFile(fileName);
        this.createFileModel(fileName, content);
        this.switchToFile(fileName);
        this.addTab(fileName);

        await this.saveCurrentFile();
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
            return '📁';
        }

        const iconMap = {
            'js': '📜',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'md': '📝',
            'txt': '📄',
            'png': '🖼️',
            'jpg': '🖼️',
            'gif': '🖼️'
        };

        return iconMap[item.extension] || '📄';
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