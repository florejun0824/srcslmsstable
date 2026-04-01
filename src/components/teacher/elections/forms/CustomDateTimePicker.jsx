import React, { useState, useEffect, Fragment } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Listbox, Transition } from '@headlessui/react';
import { CaretDown, CalendarBlank } from '@phosphor-icons/react';

// Pre-generate time options
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const AMPM = ['AM', 'PM'];

// Custom Headless UI Dropdown for Time Selection
const TimeSelect = ({ value, onChange, options, ariaLabel }) => (
    <div className="relative w-full">
        <Listbox value={value} onChange={onChange}>
            <div className="relative mt-1">
                <Listbox.Button 
                    className="relative w-full flex items-center justify-between gap-1 bg-white dark:bg-slate-900/50 pl-3 pr-2 py-3.5 md:py-4 rounded-2xl font-mono text-sm md:text-base font-semibold outline-none text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm active:scale-[0.98]"
                    aria-label={ariaLabel}
                >
                    <span className="block truncate">{value}</span>
                    <span className="pointer-events-none flex items-center">
                        <CaretDown weight="bold" className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    </span>
                </Listbox.Button>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                >
                    <Listbox.Options className="absolute z-[100] mt-2 max-h-48 w-full overflow-auto rounded-xl bg-white dark:bg-slate-800 py-1 text-base shadow-xl shadow-slate-900/10 dark:shadow-none border border-slate-100 dark:border-slate-700 outline-none sm:text-sm custom-scrollbar">
                        {options.map((opt, idx) => (
                            <Listbox.Option
                                key={idx}
                                className={({ active }) =>
                                    `relative cursor-pointer select-none py-2.5 px-4 text-center font-mono transition-colors ${
                                        active ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium'
                                    }`
                                }
                                value={opt}
                            >
                                {({ selected }) => (
                                    <span className={`block truncate ${selected ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'font-medium'}`}>
                                        {opt}
                                    </span>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </div>
        </Listbox>
    </div>
);

const CustomDateTimePicker = ({ value, onChange, minDate }) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const parsedDate = value ? new Date(value) : null;
    const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

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

    const displayHour = isValidDate ? String(parsedDate.getHours() % 12 === 0 ? 12 : parsedDate.getHours() % 12).padStart(2, '0') : '12';
    const displayMinute = isValidDate ? String(parsedDate.getMinutes()).padStart(2, '0') : '00';
    const displayAmPm = isValidDate && parsedDate.getHours() >= 12 ? 'PM' : 'AM';

    return (
        <div className="flex flex-col gap-1 relative w-full custom-datepicker-wrapper">
             <style dangerouslySetInnerHTML={{
                __html: `
                .custom-datepicker-wrapper .react-datepicker-wrapper { display: block; width: 100%; }
                
                /* Base Premium Styling */
                .react-datepicker { 
                    border-radius: 1.5rem !important; 
                    font-family: inherit; 
                    border: 1px solid rgba(226, 232, 240, 0.8) !important; 
                    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25) !important; 
                    overflow: hidden;
                    width: 100% !important;
                    max-width: 320px !important; /* Strict maximum width */
                    margin: 0 auto;
                }
                .dark .react-datepicker { border-color: rgba(30, 41, 59, 1) !important; background-color: #0f172a !important; }
                .react-datepicker__header { background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding-top: 1rem; }
                .dark .react-datepicker__header { background-color: #1e293b; border-bottom-color: #334155; }
                .react-datepicker__current-month { color: #0f172a; font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem; }
                .dark .react-datepicker__current-month { color: #f8fafc; }
                
                /* Layout Overrides for Grid to prevent overflow */
                .react-datepicker__month-container { width: 100% !important; float: none !important; }
                .react-datepicker__month { margin: 0.5rem !important; text-align: center; }
                .react-datepicker__day-names, .react-datepicker__week { 
                    display: flex !important; 
                    justify-content: space-evenly !important; /* Distributes evenly, preventing edge clipping */
                    width: 100% !important;
                }
                
                /* Day Selection Styling */
                .react-datepicker__day-name, .react-datepicker__day { 
                    color: #475569; 
                    width: 2rem !important; 
                    line-height: 2rem !important; 
                    margin: 0.1rem !important;
                    display: inline-flex !important;
                    align-items: center;
                    justify-content: center;
                }
                .dark .react-datepicker__day-name, .dark .react-datepicker__day { color: #cbd5e1; }
                
                .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected { 
                    background-color: #4f46e5 !important; 
                    color: white !important; 
                    border-radius: 999px !important; 
                    font-weight: bold; 
                    box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39); 
                }
                .react-datepicker__day:hover { background-color: #eef2ff !important; color: #4f46e5; border-radius: 999px !important; }
                .dark .react-datepicker__day:hover { background-color: rgba(79, 70, 229, 0.2) !important; color: #818cf8; }
                .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle { display: none; }

                /* --- AGGRESSIVE MOBILE PORTAL OVERRIDES --- */
                .react-datepicker-portal {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background-color: rgba(15, 23, 42, 0.6) !important;
                    backdrop-filter: blur(6px) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 99999 !important; /* Ensures it goes completely over the bottom nav */
                    padding: 1rem;
                }
                
                /* Shrink even further for tiny screens */
                @media (max-width: 360px) {
                    .react-datepicker { max-width: 290px !important; }
                    .react-datepicker__day-name, .react-datepicker__day {
                        width: 1.75rem !important;
                        line-height: 1.75rem !important;
                        font-size: 0.85rem;
                    }
                }
                
                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
                `
            }} />

            <div className="w-full relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                    <CalendarBlank weight="bold" className="w-5 h-5" />
                </div>
                <DatePicker
                    selected={isValidDate ? parsedDate : null}
                    onChange={handleDateChange}
                    dateFormat="MMM d, yyyy"
                    placeholderText="Select event date"
                    minDate={minDate ? new Date(minDate) : undefined}
                    withPortal={isMobile}
                    className="w-full pl-11 pr-4 py-3.5 md:py-4 bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-sm md:text-base font-medium outline-none text-slate-800 dark:text-slate-200 cursor-pointer placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all shadow-sm active:scale-[0.99]"
                />
            </div>

            {isValidDate && (
                <div className="flex gap-2 w-full mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <TimeSelect 
                        value={displayHour} 
                        options={HOURS} 
                        onChange={val => handleTimeChange('hour', val)} 
                        ariaLabel="Hour" 
                    />

                    <span className="flex items-center justify-center text-slate-300 dark:text-slate-600 font-bold -mx-1 pb-1">
                        :
                    </span>

                    <TimeSelect 
                        value={displayMinute} 
                        options={MINUTES} 
                        onChange={val => handleTimeChange('minute', val)} 
                        ariaLabel="Minute" 
                    />

                    <TimeSelect 
                        value={displayAmPm} 
                        options={AMPM} 
                        onChange={val => handleTimeChange('ampm', val)} 
                        ariaLabel="AM or PM" 
                    />
                </div>
            )}
        </div>
    );
};

export default CustomDateTimePicker;