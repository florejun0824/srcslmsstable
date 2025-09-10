import React from 'react';

// This component now just displays the UI based on props.
// The logic to fetch the status will live in App.js.
export default function UpdateOverlay({ status, timeLeft }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // The component is always visible when rendered, it's the parent's job to show/hide it.
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20000,
        fontFamily: `"Fira Code", monospace`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '28px',
          maxWidth: '1000px',
          padding: '20px',
        }}
      >
        <img
          src="/characters/guide.png"
          alt="Guide"
          style={{
            height: '500px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 15px rgba(0,255,200,0.6))',
          }}
        />
        <div
          style={{
            position: 'relative',
            background: '#1e1e1e',
            border: '2px solid #3c3c3c',
            borderRadius: '8px',
            padding: '20px',
            width: '520px',
            minHeight: '300px',
            fontSize: '14px',
            color: '#d4d4d4',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', // Center content vertically
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {`// System Update In Progress
("A new version is being deployed...");
("Estimated time remaining: ${formatTime(timeLeft)}");`}
          </pre>
          <div
            style={{
              position: 'absolute',
              left: '-18px',
              top: '50px',
              width: 0,
              height: 0,
              borderTop: '12px solid transparent',
              borderBottom: '12px solid transparent',
              borderRight: '18px solid #1e1e1e',
            }}
          />
        </div>
      </div>
    </div>
  );
}