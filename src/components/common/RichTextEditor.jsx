// src/components/common/RichTextEditor.js

import React, { useEffect, useRef } from 'react';
import useScript from '../../hooks/useScript'; // Assuming this hook works correctly

const RichTextEditor = ({ value, onChange }) => {
    // This custom hook loads the Quill library from a CDN
    const quillLoaded = useScript("https://cdn.jsdelivr.net/npm/quill@2.0.0/dist/quill.js", "https://cdn.jsdelivr.net/npm/quill@2.0.0/dist/quill.snow.css");

    // Refs to hold the Quill instance and the DOM element for the editor
    const quillInstance = useRef(null);
    const editorRef = useRef(null);
    // Use a ref to track if the initial value has been set to avoid re-pasting on every render
    const hasSetInitialValue = useRef(false);

    useEffect(() => {
        // Don't do anything until the Quill library is loaded and the editor DOM element exists
        if (!quillLoaded || !editorRef.current) return;

        // Initialize Quill only once
        if (quillInstance.current === null) {
            quillInstance.current = new window.Quill(editorRef.current, {
                theme: 'snow',
                modules: {
                    // --- MODIFIED: Added 'link' to the toolbar ---
                    toolbar: [
                        [{ 'header': [1, 2, false] }],
                        ['bold', 'italic', 'underline', 'link'], // The 'link' option is added here
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }]
                    ]
                }
            });

            // Set up the event listener for text changes
            quillInstance.current.on('text-change', (delta, oldDelta, source) => {
                // Only call the onChange prop if the change was made by the user
                if (source === 'user') {
                    const newContent = quillInstance.current.root.innerHTML;
                    onChange(newContent);
                }
            });

            // Set initial content after Quill is initialized
            // Use Quill's API to set content safely.
            if (value && !hasSetInitialValue.current) {
                // dangerouslyPasteHTML is a Quill method to insert HTML
                quillInstance.current.clipboard.dangerouslyPasteHTML(value);
                hasSetInitialValue.current = true; // Mark as set
            }

        } else {
            // If Quill is already initialized, handle updates from parent 'value' prop.
            // This ensures the editor updates if the parent passes a new 'value' prop
            // (e.g., when editing a different lesson).
            const currentQuillHtml = quillInstance.current.root.innerHTML;
            if (value !== currentQuillHtml && !hasSetInitialValue.current) {
                // Only update if the prop value is genuinely different from what's in the editor
                // and if we haven't already set this specific value
                quillInstance.current.clipboard.dangerouslyPasteHTML(value);
                hasSetInitialValue.current = true; // Re-mark as set for the new value
            }
        }
    }, [quillLoaded, value, onChange]); // Depend on value and onChange to react to prop changes

    // Fallback while the editor is loading
    if (!quillLoaded) {
        return <textarea className="w-full p-2 border rounded" rows="4" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Loading editor..." />;
    }

    // The editor container
    return <div ref={editorRef} style={{minHeight: '150px'}} className="bg-white"></div>;
};

export default RichTextEditor;