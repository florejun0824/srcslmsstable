import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CustomDateTimePicker = ({ value, onChange, minDate }) => {
    // Detect Desktop vs Mobile to toggle the portal UI
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Parse the current value safely
    const parsedDate = value ? new Date(value) : null;
    const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

    // --- UNIFIED HANDLERS ---
    const handleDateChange = (date) => {
        if (!date) return onChange('');
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        const currentTime = isValidDate 
            ? `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`
            : '12:00';
        
        onChange(`${year}-${month}-${day}T${currentTime}`);
    };

    const handleTimeChange = (type, val) => {
        if (!isValidDate) return; 
        
        let h = parsedDate.getHours();
        let m = parsedDate.getMinutes();
        const isCurrentlyPM = h >= 12;

        if (type === 'hour') {
            h = Number(val);
            if (h === 12) h = 0; 
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

    // Calculate current display values for the custom dropdowns
    const displayHour = isValidDate ? (parsedDate.getHours() % 12 === 0 ? 12 : parsedDate.getHours() % 12) : 12;
    const displayMinute = isValidDate ? parsedDate.getMinutes() : 0;
    const displayAmPm = isValidDate && parsedDate.getHours() >= 12 ? 'PM' : 'AM';

    return (
        <div className="flex flex-col gap-3 relative w-full custom-datepicker-wrapper">
             {/* Styles adjusted to ensure the portal looks good on mobile */}
             <style dangerouslySetInnerHTML={{
                __html: `
                .custom-datepicker-wrapper .react-datepicker-wrapper { display: block; width: 100%; }
                .react-datepicker { border-radius: 12px; font-family: inherit; border: 1px solid #e2e8f0; border: none; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
                .react-datepicker__header { background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; border-top-left-radius: 12px; border-top-right-radius: 12px; }
                .react-datepicker__day--selected { background-color: #2563eb !important; border-radius: 999px; }
                .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle { display: none; }
                /* Make tap targets larger on mobile portal */
                .react-datepicker__day { margin: 0.2rem; padding: 0.2rem; }
                `
            }} />

            {/* Unified Date Picker */}
            <div className="w-full">
                <DatePicker
                    selected={isValidDate ? parsedDate : null}
                    onChange={handleDateChange}
                    dateFormat="MMM d, yyyy"
                    placeholderText="Select date"
                    minDate={minDate ? new Date(minDate) : undefined}
                    withPortal={isMobile} // Turns into a centered modal on mobile!
                    className="w-full bg-slate-100/50 px-4 py-3 rounded-xl font-mono text-sm font-semibold outline-none text-slate-900 cursor-pointer placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600/20 transition-all border border-transparent focus:border-blue-600/30"
                />
            </div>

            {/* Unified Time Controls */}
            {isValidDate && (
                <div className="flex gap-2 w-full">
                    <select
                        value={displayHour}
                        onChange={e => handleTimeChange('hour', e.target.value)}
                        className="flex-1 bg-slate-100/50 px-2 py-3 rounded-xl font-mono text-sm font-semibold outline-none text-slate-900 cursor-pointer text-center appearance-none"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                        ))}
                    </select>

                    <span className="flex items-center justify-center text-slate-400 font-bold">:</span>

                    <select
                        value={displayMinute}
                        onChange={e => handleTimeChange('minute', e.target.value)}
                        className="flex-1 bg-slate-100/50 px-2 py-3 rounded-xl font-mono text-sm font-semibold outline-none text-slate-900 cursor-pointer text-center appearance-none"
                    >
                        {Array.from({ length: 60 }, (_, i) => i).map(m => (
                            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                        ))}
                    </select>

                    <select
                        value={displayAmPm}
                        onChange={e => handleTimeChange('ampm', e.target.value)}
                        className="flex-1 bg-slate-100/50 px-2 py-3 rounded-xl font-mono text-sm font-semibold outline-none text-slate-900 cursor-pointer text-center appearance-none"
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