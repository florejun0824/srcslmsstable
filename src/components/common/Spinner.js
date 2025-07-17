import React from 'react';
import './InteractiveSpinner.css';

/**
 * A highly modern, interactive 3D spinner.
 * Renders a full-screen glassmorphism overlay with a spinning atomic structure.
 * Animation slows down on hover for an interactive feel.
 *
 * @param {object} props - The component props.
 * @param {boolean} [props.isLoading=true] - Set to false to hide the spinner.
 * @param {string} [props.text='Loading...'] - The text displayed below the spinner.
 */
const InteractiveSpinner = ({ isLoading = true, text = 'Loading...' }) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="spinner-overlay" role="status">
      <div className="spinner-container">
        <div className="spinner-atom">
          <div className="ring ring-1"></div>
          <div className="ring ring-2"></div>
          <div className="ring ring-3"></div>
        </div>
        {text && <span className="spinner-text">{text}</span>}
      </div>
    </div>
  );
};

export default InteractiveSpinner;