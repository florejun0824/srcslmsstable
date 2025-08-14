import React, { useState, useEffect } from 'react';
import './Spinner.css'; // Ensure this path is correct

/**
 * A modern, branded spinner with a custom logo, vibrant revolving gradient,
 * the official "Gemini" logo, and a typewriter effect for the main loading message.
 * Renders a full-screen overlay.
 *
 * @param {object} props - The component props.
 * @param {boolean} [props.isLoading=true] - Set to false to hide the spinner.
 * @param {string} [props.text='Loading...'] - The main text to be displayed with a typewriter effect.
 */
const Spinner = ({ isLoading = true, text = 'Loading...' }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (isLoading) {
      const timer = setInterval(() => {
        setDisplayedText(currentText => {
          if (currentText.length === text.length) {
            clearInterval(timer);
            return currentText;
          }
          return text.substring(0, currentText.length + 1);
        });
      }, 150); // Adjust speed of typing here (in milliseconds)

      return () => {
        clearInterval(timer);
        setDisplayedText('');
      };
    }
  }, [isLoading, text]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="spinner-overlay" role="status" aria-live="polite">
      <div className="spinner-container">

        {/* Pulsar effect container with school logo inside */}
        <div className="pulsar-spinner relative flex items-center justify-center">
          {/* School Logo */}
          <img
            src="https://i.ibb.co/XfJ8scGX/1.png"
            alt="School Logo"
            className="school-logo w-[85%] h-[85%] rounded-full object-cover z-10" // Increased size
            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x100/CCCCCC/000000?text=Logo"; }}
          />
        </div>

        {/* SRCS LEARNING PORTAL text */}
        <div className="branding-text text-xl text-white font-bold tracking-wider mt-4">
            SRCS LEARNING PORTAL
        </div>

        {/* Typewriter Text */}
        <div className="spinner-text-container">
          {displayedText}
          <span className="typing-cursor"></span>
        </div>
      </div>
    </div>
  );
};

export default Spinner;
