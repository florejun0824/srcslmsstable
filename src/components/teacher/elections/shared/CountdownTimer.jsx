import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ revealTime, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const revealMs = revealTime?.toMillis ? revealTime.toMillis() : new Date(revealTime).getTime();
      const diff = revealMs - Date.now();

      if (diff <= 0) {
        setTimeLeft('Ready');
        setIsFinished(true);
        if (onComplete) onComplete();
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [revealTime, onComplete]);

  return <span className={isFinished ? "text-emerald-500 font-semibold" : "font-mono tabular-nums"}>{timeLeft}</span>;
};

export default CountdownTimer;