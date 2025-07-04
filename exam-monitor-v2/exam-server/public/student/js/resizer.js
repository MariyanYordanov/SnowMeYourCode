/**
 * Resizer System for 3-Column Grid Layout
 * Handles draggable resizing of panels.
 */

export function initializeResizers() {
    const container = document.querySelector('.exam-container');
    const resizers = document.querySelectorAll('.resizer');

    if (!container) {
        console.warn('Exam container not found for resizers.');
        return;
    }

    let isResizing = false;
    let activeResizer = null;
    let startX = 0;
    let startWidths = [];

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', startResize);
        resizer.addEventListener('touchstart', startResize, { passive: false });
    });

    function startResize(e) {
        e.preventDefault();
        isResizing = true;
        activeResizer = e.target;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;

        const computedStyle = getComputedStyle(container);
        const gridTemplate = computedStyle.getPropertyValue('grid-template-columns');
        startWidths = gridTemplate.split(' ').map(val => parseFloat(val));

        document.addEventListener('mousemove', doResize);
        document.addEventListener('touchmove', doResize, { passive: false });
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchend', stopResize);

        // Add styling for active resizing
        document.body.style.cursor = 'col-resize';
        container.classList.add('is-resizing');
    }

    function doResize(e) {
        if (!isResizing) return;
        e.preventDefault();

        const currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const deltaX = currentX - startX;

        // Determine which columns to adjust based on the resizer
        const resizerId = activeResizer.id;
        const newWidths = [...startWidths];

        if (resizerId === 'resizer-files' && newWidths.length === 5) {
            // Adjusts space between files panel and editor
            const newFilesWidth = startWidths[0] + deltaX;
            const newEditorWidth = startWidths[2] - deltaX;

            // Enforce minimum widths (e.g., 150px)
            if (newFilesWidth > 150 && newEditorWidth > 200) {
                newWidths[0] = newFilesWidth;
                newWidths[2] = newEditorWidth;
            }
        } else if (resizerId === 'resizer-devtools' && newWidths.length === 5) {
            // Adjusts space between editor and devtools
            const newEditorWidth = startWidths[2] + deltaX;
            const newDevToolsWidth = startWidths[4] - deltaX;

            // Enforce minimum widths
            if (newEditorWidth > 200 && newDevToolsWidth > 150) {
                newWidths[2] = newEditorWidth;
                newWidths[4] = newDevToolsWidth;
            }
        }

        // Apply the new grid template columns
        container.style.gridTemplateColumns = `
            ${newWidths[0]}px 
            ${newWidths[1]}px 
            ${newWidths[2]}px 
            ${newWidths[3]}px 
            ${newWidths[4]}px
        `;
    }

    function stopResize() {
        if (!isResizing) return;
        isResizing = false;
        activeResizer = null;

        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('touchmove', doResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchend', stopResize);

        // Remove active resizing styles
        document.body.style.cursor = 'default';
        container.classList.remove('is-resizing');

        // Persist the layout if needed (optional)
        // const finalGridTemplate = container.style.gridTemplateColumns;
        // localStorage.setItem('examGridLayout', finalGridTemplate);
    }

    console.log('Resizer system initialized');
}
