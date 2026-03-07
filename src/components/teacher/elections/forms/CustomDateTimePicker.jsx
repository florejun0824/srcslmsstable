import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CustomDateTimePicker = ({ value, onChange, minDate }) => {
    // 1. Detect Desktop vs Mobile
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            // 768px is the standard Tailwind 'md' breakpoint
            setIsMobile(window.innerWidth < 768);
        };
        
        // Check on mount and listen for resizes
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 2. Parse the current value safely
    const parsedDate = value ? new Date(value) : null;
    const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

    // --- MOBILE HANDLERS (Native Inputs) ---
    const handleNativeDateChange = (e) => {
        const newDate = e.target.value; // Format: YYYY-MM-DD
        const currentTime = isValidDate 
            ? `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`
            : '12:00';
        onChange(`${newDate}T${currentTime}`);
    };

    const handleNativeTimeChange = (e) => {
        const newTime = e.target.value; // Format: HH:mm
        const currentDate = isValidDate
            ? value.split('T')[0]
            : new Date().toISOString().split('T')[0];
        onChange(`${currentDate}T${newTime}`);
    };

    // --- DESKTOP HANDLERS (React DatePicker) ---
    const handleDesktopDateChange = (date) => {
        if (!date) return onChange('');
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        const currentTime = isValidDate 
            ? `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`
            : '12:00';
        
        onChange(`${year}-${month}-${day}T${currentTime}`);
    };

    const handleDesktopTimeChange = (type, val) => {
        if (!isValidDate) return; // Wait for a date to be selected first
        
        let h = parsedDate.getHours();
        let m = parsedDate.getMinutes();
        const isCurrentlyPM = h >= 12;

        if (type === 'hour') {
            h = Number(val);
            if (h === 12) h = 0; // Reset 12 to 0 for calculation
            if (isCurrentlyPM) h += 12;
        } else if (type === 'minute') {
            m = Number(val);
        } else if (type === 'ampm') {
            if (val === 'PM' && h < 12) h += 12;
            if (val === 'AM' && h >= 12) h -= 12;
        }

        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        const strH = String(h).padStart(2, '0');
        const strM = String(m).padStart(2, '0');

        onChange(`${year}-${month}-${day}T${strH}:${strM}`);
    };

    // --- RENDER HELPERS ---
    const formattedMinDate = minDate ? new Date(minDate).toISOString().split('T')[0] : undefined;

    // --- MOBILE UI RETURN ---
    if (isMobile) {
        const nativeDateVal = isValidDate ? value.split('T')[0] : '';
        const nativeTimeVal = isValidDate ? `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}` : '';

        return (
            <div className="flex flex-col gap-3 w-full">
                <input
                    type="date"
                    value={nativeDateVal}
                    min={formattedMinDate}
                    onChange={handleNativeDateChange}
                    className="w-full bg-slate-100/50 px-4 py-3 rounded-xl font-mono text-sm font-semibold outline-none text-slate-900 focus:ring-2 focus:ring-blue-600/20 transition-all border border-transparent focus:border-blue-600/30 block appearance-none"
                />
                <input
                    type="time"
                    value={nativeTimeVal}
                    onChange={handleNativeTimeChange}
                    className="w-full bg-slate-100/50 px-4 py-3 rounded-xl font-mono text-sm font-semibold outline-none text-slate-900 focus:ring-2 focus:ring-blue-600/20 transition-all border border-transparent focus:border-blue-600/30 block appearance-none"
                />
            </div>
        );
    }

    // --- DESKTOP UI RETURN ---
    // Calculate current display values for the custom dropdowns
    const displayHour = isValidDate ? (parsedDate.getHours() % 12 === 0 ? 12 : parsedDate.getHours() % 12) : 12;
    const displayMinute = isValidDate ? parsedDate.getMinutes() : 0;
    const displayAmPm = isValidDate && parsedDate.getHours() >= 12 ? 'PM' : 'AM';

    return (
        <div className="flex flex-col gap-3 relative w-full custom-datepicker-wrapper">
             {/* Retain your existing CSS injection here if needed */}
             <style dangerouslySetInnerHTML={{
                __html: `
                .custom-datepicker-wrapper .react-datepicker-wrapper { display: block; width: 100%; }
                .react-datepicker { border-radius: 12px; font-family: inherit; border: 1px solid #e2e8f0; }
                .react-datepicker__header { background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                .react-datepicker__day--selected { background-color: #2563eb !important; border-radius: 999px; }
                `
            }} />

            {/* Desktop Date Picker */}
            <div className="w-full">
                <DatePicker
                    selected={isValidDate ? parsedDate : null}
                    onChange={handleDesktopDateChange}
                    dateFormat="MMM d, yyyy"
                    placeholderText="Select date"
                    minDate={minDate ? new Date(minDate) : undefined}
                    className="w-full bg-slate-100/50 px-4 py-3 rounded-xl font-mono text-sm font-semibold outline-none text-slate-900 cursor-pointer placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600/20 transition-all border border-transparent focus:border-blue-600/30"
                />
            </div>

            {/* Desktop Time Controls */}
            {isValidDate && (
                <div className="flex gap-2 w-full">
                    <select
                        value={displayHour}
                        onChange={e => handleDesktopTimeChange('hour', e.target.value)}
                        className="flex-1 bg-slate-100/50 px-2 py-3 rounded-xl font-mono text-sm font-semibold outline-none text-slate-900 cursor-pointer text-center"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                        ))}
                    </select>

                    <span className="flex items-center justify-center text-slate-400 font-bold">:</span>

                    <select
                        value={displayMinute}
                        onChange={e => handleDesktopTimeChange('minute', e.target.value)}
                        className="flex-1 bg-slate-100/50 px-2 py-3 rounded-xl font-mono text-sm font-semibold outline-none text-slate-900 cursor-pointer text-center"
                    >
                        {Array.from({ length: 60 }, (_, i) => i).map(m => (
                            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                        ))}
                    </select>

                    <select
                        value={displayAmPm}
                        onChange={e => handleDesktopTimeChange('ampm', e.target.value)}
                        className="flex-1 bg-slate-100/50 px-2 py-3 rounded-xl font-mono text-sm font-semibold outline-none text-slate-900 cursor-pointer text-center"
                    >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                    </select>
                </div>
            )}
        </div>
    );
};

export default CustomDateTimePicker;