/**
 * Preview Manager - Live HTML/CSS/JS Preview
 */

export class PreviewManager {
    constructor() {
        this.previewFrame = null;
        this.currentFiles = new Map();
        this.autoRefresh = true;
        this.refreshDebounceTimer = null;
        
        this.init();
    }

    init() {
        // Preview frame is no longer needed as we open directly in new tab
        console.log('🖼️ Preview Manager initialized');
    }


    /**
     * Update preview with current project files
     */
    async refreshPreview() {
        try {
            const sessionId = window.ExamApp?.sessionId;
            if (!sessionId) {
                console.warn('No session ID for preview');
                return;
            }

            // Get current project files
            const response = await fetch(`/api/project/files?sessionId=${sessionId}`);
            const result = await response.json();

            if (!result.success || !result.files) {
                this.showPreviewMessage('No project files found');
                return;
            }

            // Find HTML entry point
            const htmlFile = result.files.find(f => 
                f.name === 'index.html' || f.path === 'index.html' || 
                f.name.endsWith('.html')
            );

            if (!htmlFile) {
                this.showPreviewMessage('No HTML file found. Create an index.html file to see preview.');
                return;
            }

            // Load and preview the HTML file
            await this.loadHTMLPreview(htmlFile.path || htmlFile.name, sessionId);

        } catch (error) {
            console.error('Preview refresh failed:', error);
            this.showPreviewMessage('Error loading preview');
        }
    }

    /**
     * Load HTML file and create preview
     */
    async loadHTMLPreview(htmlFileName, sessionId) {
        try {
            // Get HTML content
            const htmlResponse = await fetch(`/api/project/file/${encodeURIComponent(htmlFileName)}?sessionId=${sessionId}`);
            const htmlResult = await htmlResponse.json();

            if (!htmlResult.success) {
                this.showPreviewMessage('Could not load HTML file');
                return;
            }

            // Create preview document
            let htmlContent = htmlResult.content;
            
            // Inject base tag to resolve relative paths
            const baseTag = `<base href="/api/project/preview/${sessionId}/">`;
            if (htmlContent.includes('<head>')) {
                htmlContent = htmlContent.replace('<head>', `<head>${baseTag}`);
            } else if (htmlContent.includes('<html>')) {
                htmlContent = htmlContent.replace('<html>', `<html><head>${baseTag}</head>`);
            } else {
                htmlContent = `<head>${baseTag}</head>${htmlContent}`;
            }

            // Update iframe with new content
            this.updatePreviewFrame(htmlContent);

        } catch (error) {
            console.error('Error loading HTML preview:', error);
            this.showPreviewMessage('Error loading HTML content');
        }
    }

    /**
     * Update iframe with HTML content
     */
    updatePreviewFrame(htmlContent) {
        if (!this.previewFrame) return;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        this.previewFrame.onload = () => {
            URL.revokeObjectURL(url);
        };
        
        this.previewFrame.src = url;
    }

    /**
     * Show message in preview frame
     */
    showPreviewMessage(message) {
        const messageHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Preview</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: #f5f5f5;
                        color: #666;
                    }
                    .message {
                        text-align: center;
                        padding: 2rem;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .icon { font-size: 3rem; margin-bottom: 1rem; }
                </style>
            </head>
            <body>
                <div class="message">
                    <div class="icon">🖼️</div>
                    <p>${message}</p>
                </div>
            </body>
            </html>
        `;
        
        this.updatePreviewFrame(messageHTML);
    }

    /**
     * Open preview in new tab directly without iframe
     */
    async openPreviewInNewTab() {
        try {
            const sessionId = window.ExamApp?.sessionId;
            if (!sessionId) {
                console.warn('No session ID for preview');
                alert('Please log in to preview your project');
                return;
            }

            // Get current project files
            const response = await fetch(`/api/project/files?sessionId=${sessionId}`);
            const result = await response.json();

            if (!result.success || !result.files) {
                alert('No project files found. Create an index.html file to see preview.');
                return;
            }

            // Find HTML entry point
            const htmlFile = result.files.find(f => 
                f.name === 'index.html' || f.path === 'index.html' || 
                f.name.endsWith('.html')
            );

            if (!htmlFile) {
                alert('No HTML file found. Create an index.html file to see preview.');
                return;
            }

            // Get HTML content
            const htmlResponse = await fetch(`/api/project/file/${encodeURIComponent(htmlFile.path || htmlFile.name)}?sessionId=${sessionId}`);
            const htmlResult = await htmlResponse.json();

            if (!htmlResult.success) {
                alert('Could not load HTML file');
                return;
            }

            // Create preview document with base tag for resources
            let htmlContent = htmlResult.content;
            const baseTag = `<base href="/api/project/preview/${sessionId}/">`;
            if (htmlContent.includes('<head>')) {
                htmlContent = htmlContent.replace('<head>', `<head>${baseTag}`);
            } else if (htmlContent.includes('<html>')) {
                htmlContent = htmlContent.replace('<html>', `<html><head>${baseTag}</head>`);
            } else {
                htmlContent = `<head>${baseTag}</head>${htmlContent}`;
            }

            // Open in new tab
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(htmlContent);
                newWindow.document.close();
                
                // Update Elements tab in DevTools
                if (window.devToolsUI) {
                    window.devToolsUI.updateElementsDisplay();
                }
            } else {
                alert('Pop-up blocked. Please allow pop-ups for this site.');
            }

        } catch (error) {
            console.error('Preview failed:', error);
            alert('Error loading preview');
        }
    }

    /**
     * Open preview in new tab (legacy method for iframe content)
     */
    openInNewTab() {
        if (!this.previewFrame || !this.previewFrame.src || this.previewFrame.src === 'about:blank') {
            alert('No preview to open. Please create some HTML content first.');
            return;
        }

        const newWindow = window.open('', '_blank');
        newWindow.document.write(this.previewFrame.contentDocument.documentElement.outerHTML);
        newWindow.document.close();
    }

    /**
     * Auto-refresh on file changes
     */
    onFileChanged(fileName) {
        if (!this.autoRefresh) return;

        // Debounce refresh to avoid too many updates
        clearTimeout(this.refreshDebounceTimer);
        this.refreshDebounceTimer = setTimeout(() => {
            this.refreshPreview();
        }, 500);
    }

    /**
     * Set auto-refresh mode
     */
    setAutoRefresh(enabled) {
        this.autoRefresh = enabled;
    }
}

// Export singleton instance
export const previewManager = new PreviewManager();