// src/components/common/CustomDateTimePicker.js
import React from 'react';
import PortalDatePicker from './PortalDatePicker'; // Adjust path if PortalDatePicker is elsewhere

const CustomDateTimePicker = ({ selectedDate, onDateChange, isClearable = false, placeholder = "Select date" }) => {

    const handleDateSelect = (date) => {
        if (!date) {
            onDateChange(null);
            return;
        }
        // Create a new Date object, preserving the time from selectedDate if it exists,
        // otherwise use current time for a fresh date
        const newDate = new Date(selectedDate || new Date()); 
        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        onDateChange(newDate);
    };

    const handleTimeSelect = (timeValue) => {
        if (!timeValue) {
            // Optional: You could set time to midnight if cleared, or just return
            return;
        }
        const [hours, minutes] = timeValue.split(':');
        // If no date is selected yet, use current date as a base
        const newDate = new Date(selectedDate || new Date());
        newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        newDate.setMinutes(parseInt(minutes, 10)); // Ensure minutes are also set
        onDateChange(newDate);
    };
    
    // Format the time part of the selectedDate for the input type="time"
    const timeValue = selectedDate 
        ? `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}` 
        : '';

    return (
        <div className="flex gap-2">
            <PortalDatePicker
                className="w-2/3" // Keep the width for proper flex layout
                selected={selectedDate} 
                onSelect={handleDateSelect} 
                placeholder={placeholder}
                enableClear={isClearable} 
            />
            <input
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeSelect(e.target.value)}
                className="w-1/3 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white"
            />
        </div>
    );
};

export default CustomDateTimePicker;