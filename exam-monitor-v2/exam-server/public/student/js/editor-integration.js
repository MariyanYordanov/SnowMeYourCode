import { MonacoFileManager } from './monaco-file-manager.js';

let fileManager = null;

export function initializeFileManager(editorInstance) {
    if (!editorInstance) {
        console.error('Editor instance required for file manager');
        return null;
    }

    fileManager = new MonacoFileManager(editorInstance);

    window.ExamApp.fileManager = fileManager;

    setupFileManagerCommands(editorInstance);

    return fileManager;
}

function setupFileManagerCommands(editor) {
    editor.addAction({
        id: 'save-file',
        label: 'Save File',
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
        ],
        precondition: null,
        keybindingContext: null,
        contextMenuGroupId: 'file',
        contextMenuOrder: 1.5,
        run: () => {
            fileManager.saveCurrentFile();
        }
    });

    editor.addAction({
        id: 'close-file',
        label: 'Close File',
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW
        ],
        run: () => {
            fileManager.closeCurrentFile();
        }
    });

    editor.addAction({
        id: 'new-file',
        label: 'New File',
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN
        ],
        run: () => {
            fileManager.createNewFile();
        }
    });
}

export function updateEditorIntegration() {
    const existingInitEditor = window.initializeMonacoEditor;

    window.initializeMonacoEditor = function () {
        const editor = existingInitEditor();

        if (editor) {
            setTimeout(() => {
                const fm = initializeFileManager(editor);

                if (fm && window.ExamApp?.sessionId) {
                    fm.loadProjectStructure(window.ExamApp.sessionId);
                }
            }, 100);
        }

        return editor;
    };
}

export function loadStarterProject() {
    if (!fileManager) return;

    const starterFiles = {
        'index.html': `<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Моят проект</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Добре дошли!</h1>
    <div id="app"></div>
    <script src="script.js"></script>
</body>
</html>`,
        'style.css': `* {
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

h1 {
    text-align: center;
    color: #333;
    margin: 20px 0;
}

#app {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}`,
        'script.js': `// Вашият код
console.log("Здравей, свят!");

function main() {
    const app = document.getElementById('app');
    app.innerHTML = '<p>Започнете да пишете код...</p>';
}

document.addEventListener('DOMContentLoaded', main);`
    };

    Object.entries(starterFiles).forEach(([fileName, content]) => {
        fileManager.createFileModel(fileName, content);
        fileManager.addTab(fileName);
    });

    fileManager.switchToFile('index.html');
}

export { fileManager };