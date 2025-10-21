// src/components/common/PortalDatePicker.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { CalendarDaysIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/solid';

// Uncomment this line if react-day-picker's default styles are not automatically applied
// import 'react-day-picker/dist/style.css'; 


// Get or create the portal root element in the body
let portalRoot = document.getElementById('datepicker-portal-root');
if (!portalRoot) {
    portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'datepicker-portal-root');
    document.body.appendChild(portalRoot);
}

export default function PortalDatePicker({ selected, onSelect, placeholder = 'Select date', enableClear = false, className }) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const dayPickerRef = useRef(null); // Ref for the DayPicker calendar container

    // Function to calculate and set position, ensuring it stays in viewport
    const calculatePosition = useCallback(() => {
        if (!buttonRef.current || !isOpen) return;

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        // Approximate width/height of DayPicker. Adjust if your calendar is significantly different.
        const calendarWidth = 300; 
        const calendarHeight = 300; 
        const padding = 10; // Padding from viewport edges

        let newTop = buttonRect.bottom + 8; // Default to below button, plus some spacing
        let newLeft = buttonRect.left;      // Default to align with button left

        // Check if it goes off screen to the right
        if (newLeft + calendarWidth > viewportWidth - padding) {
            newLeft = viewportWidth - calendarWidth - padding;
        }
        // Ensure it doesn't go off screen to the left
        if (newLeft < padding) {
            newLeft = padding;
        }

        // Check if it goes off screen to the bottom, try to position above if it does
        if (newTop + calendarHeight > viewportHeight - padding) {
            newTop = buttonRect.top - calendarHeight - 8; // Position above the button, plus spacing
        }
        // Ensure it doesn't go off screen to the top
        if (newTop < padding) {
            newTop = padding;
        }
        
        setPosition({ top: newTop, left: newLeft });
    }, [isOpen]);

    // Recalculate position on open and on window resize/scroll
    useEffect(() => {
        if (isOpen) {
            calculatePosition(); // Initial calculation
            window.addEventListener('resize', calculatePosition);
            // Consider adding a scroll listener if the modal itself can scroll
            // and the input button's position changes relative to the viewport.
        }

        return () => {
            window.removeEventListener('resize', calculatePosition);
        };
    }, [isOpen, calculatePosition]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isOpen &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target) &&
                dayPickerRef.current &&
                !dayPickerRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleDaySelect = (date) => {
        onSelect(date);
        setIsOpen(false);
    };

    const handleClear = () => {
        onSelect(null);
        setIsOpen(false);
    };

    const buttonText = selected ? format(selected, 'PP') : placeholder;

    return (
        <div className={`relative ${className}`}> {/* Apply className prop to the wrapper div */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-full cursor-pointer rounded-lg bg-white py-2.5 pl-10 pr-4 text-left shadow-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
            >
                <CalendarDaysIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none" />
                {buttonText}
                {enableClear && selected && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleClear(); }} // Stop propagation to prevent opening/closing immediately
                        className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-red-500"
                        aria-label="Clear date"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                )}
            </button>
            
            {isOpen && createPortal(
                <div
                    ref={dayPickerRef} // Attach ref here for outside click
                    className="datepicker-portal absolute bg-white rounded-lg shadow-lg border border-gray-200" // Add bg, shadow, border
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        position: 'fixed', // Use fixed positioning as the calendar is in the body, independent of scroll
                        zIndex: 9999, // Ensure it's on top of everything, including modal (modal is z-100)
                    }}
                >
                    <DayPicker
                        mode="single"
                        selected={selected}
                        onSelect={handleDaySelect}
                        // --- Removed showOutsideDays to only display current month's days ---
                        fixedWeeks // Keep fixedWeeks if you want consistent calendar height
                        className="p-2" // Add some padding around the DayPicker itself
                    />
                </div>,
                portalRoot // Render into the designated portal root div in the body
            )}
        </div>
    );
}