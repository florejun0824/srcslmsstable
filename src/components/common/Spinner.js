import React, { useState, useEffect } from 'react';
import './Spinner.css'; // This will now apply the new Ethereal Chronos Bloom styles

/**
 * The "Ethereal Chronos Bloom" spinner – a beautiful, compact, and intricate loading interface
 * designed as a magical, unfolding artifact, optimized for adaptive backgrounds.
 *
 * @param {object} props - The component props.
 * @param {boolean} [props.isLoading=true] - Set to false to hide the spinner.
 * @param {string} [props.text='Opening the Portal to a Whole New World for You...'] - The text to be displayed.
 */
const Spinner = ({ isLoading = true, text = 'Preparing Something Great for You...' }) => {
  const [displayedText, setDisplayedText] = useState('');
  const numPetals = 6; // Number of primary bloom petals/shards
  const numMotes = 80; // Number of drifting energy motes/pollen

  // Pre-calculate data for energy motes (random positions, sizes, delays, and drift paths)
  const [energyMoteData] = useState(() => {
    const data = [];
    const spinnerSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spinner-size'));
    const maxDriftDistance = spinnerSize * 0.8; // Motes drift outwards significantly

    for (let i = 0; i < numMotes; i++) {
      // Start motes from near the core
      const startAngle = Math.random() * Math.PI * 2;
      const startRadius = Math.random() * (spinnerSize * 0.1); // Closer to core
      const startX = startRadius * Math.cos(startAngle);
      const startY = startRadius * Math.sin(startAngle);

      // End motes drifting outwards
      const endAngle = Math.random() * Math.PI * 2;
      const endRadius = maxDriftDistance * (0.5 + Math.random() * 0.5); // Random radius outwards
      const endX = endRadius * Math.cos(endAngle);
      const endY = endRadius * Math.sin(endAngle);

      data.push({
        key: `mote-${i}`,
        size: `${2 + Math.random() * 2}px`, // Motes from 2px to 4px
        left: `calc(50% + ${startX}px)`,
        top: `calc(50% + ${startY}px)`,
        animationDelay: `${Math.random() * 8}s`, // Random delay up to drift duration
        moteStartX: `${startX}px`,
        moteStartY: `${startY}px`,
        moteEndX: `${endX}px`,
        moteEndY: `${endY}px`,
      });
    }
    return data;
  });

  useEffect(() => {
    if (isLoading) {
      setDisplayedText('');

      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        setDisplayedText(currentText => {
          if (currentIndex < text.length) {
            currentIndex++;
            return text.substring(0, currentIndex);
          } else {
            clearInterval(typeInterval);
            return currentText;
          }
        });
      }, 15); // Faster typing for modern feel

      return () => {
        clearInterval(typeInterval);
        setDisplayedText('');
      };
    }
  }, [isLoading, text]);

  if (!isLoading) {
    return null;
  }

  // Render bloom petals dynamically
  const bloomPetals = Array.from({ length: numPetals }).map((_, index) => {
    const rotateZ = (360 / numPetals) * index;
    // Alternate initial rotation slightly for more organic look
    const initialRotateX = (index % 2 === 0) ? 10 : -10;
    const initialRotateY = (index % 3 === 0) ? 5 : -5;

    return (
      <div
        key={`bloom-petal-${index}`}
        className="bloom-petal"
        style={{
          transform: `translate(-50%, -50%) rotateZ(${rotateZ}deg) rotateX(${initialRotateX}deg) rotateY(${initialRotateY}deg) translateZ(-5px)`,
          animationDelay: `-${index * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--animation-speed-bloom')) / numPetals)}s`,
          '--_initial-rotate-z': `${rotateZ}deg`,
          '--_initial-rotate-x': `${initialRotateX}deg`,
          '--_initial-rotate-y': `${initialRotateY}deg`,
          background: `linear-gradient(45deg, var(--color-petal-base-${(index % 2) + 1}), var(--color-petal-base-${((index + 1) % 2) + 1}))`,
          boxShadow: `inset 0 0 5px rgba(255,255,255,0.2), 0 0 15px var(--color-petal-edge-${(index % 2) + 1}), 0 0 30px var(--color-petal-edge-${((index + 1) % 2) + 1})`,
        }}
      ></div>
    );
  });

  return (
    <div className="spinner-overlay" role="status" aria-live="polite">
      <div className="spinner-container">
        {/*
          HTML structure for the Ethereal Chronos Bloom.
          Contains a central core, dynamic petals, and drifting motes.
        */}
        <div className="ethereal-chronos-bloom">
          <div className="bloom-core"></div>
          {bloomPetals}
          {energyMoteData.map(mote => (
            <div
              key={mote.key}
              className="energy-mote"
              style={{
                width: mote.size,
                height: mote.size,
                left: mote.left,
                top: mote.top,
                animationDelay: mote.animationDelay,
                '--mote-start-x': mote.moteStartX, // Pass CSS variables for animation
                '--mote-start-y': mote.moteStartY,
                '--mote-end-x': mote.moteEndX,
                '--mote-end-y': mote.moteEndY,
              }}
            ></div>
          ))}
        </div>

        <div className="spinner-text-container">
          {displayedText}
          <span className="typing-cursor"></span>
        </div>
      </div>
    </div>
  );
};

export default Spinner;