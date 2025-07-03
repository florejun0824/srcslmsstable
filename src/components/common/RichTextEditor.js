import React, { useEffect, useRef } from 'react';
import useScript from '../../hooks/useScript';

const RichTextEditor = ({ value, onChange }) => {
    // This custom hook loads the Quill library from a CDN
    const quillLoaded = useScript("https://cdn.jsdelivr.net/npm/quill@2.0.0/dist/quill.js", "https://cdn.jsdelivr.net/npm/quill@2.0.0/dist/quill.snow.css");
    
    // Refs to hold the Quill instance and the DOM element for the editor
    const quillInstance = useRef(null);
    const editorRef = useRef(null);
    const valueRef = useRef(value); // Use a ref to hold the latest value to prevent stale closures

    // Update the ref whenever the value prop changes
    valueRef.current = value;

    useEffect(() => {
        // Don't do anything until the Quill library is loaded and the editor DOM element exists
        if (!quillLoaded || !editorRef.current) return;

        // Initialize Quill only once
        if (quillInstance.current === null) {
            quillInstance.current = new window.Quill(editorRef.current, {
                theme: 'snow',
                modules: { 
                    toolbar: [
                        [{ 'header': [1, 2, false] }], 
                        ['bold', 'italic', 'underline'], 
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
                    valueRef.current = newContent; // Also update the ref
                }
            });
        }

        // --- REAL-TIME FIX ---
        // This is the key change. We check if the editor's current content
        // is different from the parent component's state (the 'value' prop).
        // If it is, we update the editor's content to match.
        // This keeps the editor in sync when loading initial data or making external changes.
        if (quillInstance.current.root.innerHTML !== valueRef.current) {
            quillInstance.current.root.innerHTML = valueRef.current;
        }

    }, [quillLoaded, onChange]); // The dependency array is simplified

    // Fallback while the editor is loading
    if (!quillLoaded) {
        return <textarea className="w-full p-2 border rounded" rows="4" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Loading editor..." />;
    }
    
    // The editor container
    return <div ref={editorRef} style={{minHeight: '150px'}} className="bg-white"></div>;
};

export default RichTextEditor;