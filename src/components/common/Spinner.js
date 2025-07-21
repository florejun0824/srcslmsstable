import React, { useState, useEffect } from 'react';
import './Spinner.css';

/**
 * A refined, modern spinner with an interactive typewriter text effect.
 * Renders a full-screen overlay with a rotating SVG spinner.
 * The loading text appears character by character for a dynamic feel.
 *
 * @param {object} props - The component props.
 * @param {boolean} [props.isLoading=true] - Set to false to hide the spinner.
 * @param {string} [props.text='Loading...'] - The text to be displayed with a typewriter effect.
 */
const Spinner = ({ isLoading = true, text = 'Loading...' }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    // Only run the effect if the spinner is active
    if (isLoading) {
      setDisplayedText(''); // Reset text when spinner appears

      let index = 0;
      const timer = setInterval(() => {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
        if (index === text.length) {
          clearInterval(timer);
        }
      }, 150); // Adjust speed of typing here (in milliseconds)

      // Cleanup function to clear the interval if the component unmounts
      return () => clearInterval(timer);
    }
  }, [isLoading, text]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="spinner-overlay" role="status" aria-live="polite">
      <div className="spinner-container">
        <svg className="spinner-svg" viewBox="0 0 50 50">
          <circle
            className="spinner-path"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="5"
          ></circle>
        </svg>
        <div className="spinner-text-container">
          {displayedText}
          <span className="typing-cursor"></span>
        </div>
      </div>
    </div>
  );
};

export default Spinner;