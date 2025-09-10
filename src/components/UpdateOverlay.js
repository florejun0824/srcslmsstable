import React, { useState, useEffect } from 'react';

export default function UpdateOverlay({ status, timeLeft, onEnter }) {
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [message, setMessage] = useState('');

  const files = [
    "Initializing update protocol...",
    "Downloading core modules (1/5)...",
    "Downloading UI assets (2/5)...",
    "Downloading content data (3/5)...",
    "Downloading security patches (4/5)...",
    "Downloading dependencies (5/5)...",
    "Verifying integrity...",
    "Installing updates...",
    "Cleaning up temporary files...",
    "Restarting services...",
    "Update complete. Launching new version..."
  ];

  useEffect(() => {
    let progressInterval;
    let fileInterval;
    let messageInterval;

    if (status === 'building') {
      // Simulate progress bar filling up
      setProgress(0);
      setCurrentFile(files[0]);
      setMessage("Preparing update...");

      // Fills up over ~4.5 minutes (2700ms * 100 = 270s)
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 99) return prev + 1;
          return prev;
        });
      }, 2700); 

      let fileIndex = 0;
      // Change file every ~27 seconds to spread across 5 minutes
      fileInterval = setInterval(() => {
        if (fileIndex < files.length - 1) {
          fileIndex++;
          setCurrentFile(files[fileIndex]);
          setMessage(files[fileIndex]);
        }
      }, 27000);

      // Final message after 4 minutes
      messageInterval = setInterval(() => {
        setMessage("Applying final configurations...");
      }, 240000); 
      
    } else if (status === 'complete') {
      setProgress(100);
      setCurrentFile("All modules updated.");
      setMessage("System update successful! Please click 'Enter' to proceed.");
    }

    return () => {
      clearInterval(progressInterval);
      clearInterval(fileInterval);
      clearInterval(messageInterval);
    };
  }, [status]); // Effect now only depends on status change

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20000,
        fontFamily: `"Fira Code", monospace`,
        color: '#00ffc0', // Neon green for terminal feel
        overflow: 'hidden',
        fontSize: '14px',
      }}
    >
      {/* Background grid/dots for terminal effect */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(#00ffc033 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        opacity: 0.1,
      }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '30px',
          maxWidth: '800px',
          width: '90%',
          padding: '40px',
          background: 'rgba(0,255,192,0.05)', // Slightly glowing box
          border: '2px solid #00ffc0',
          borderRadius: '12px',
          boxShadow: '0 0 30px rgba(0,255,192,0.3)',
          position: 'relative',
        }}
      >
        <img
          src="/characters/guide 2.png"
          alt="Update Assistant"
          style={{
            height: '180px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 10px rgba(0,255,192,0.8))',
            marginBottom: '20px',
          }}
        />

        <div style={{ width: '100%', textAlign: 'left', marginBottom: '20px' }}>
          {status === 'building' ? (
            <>
              <pre style={{ margin: '0 0 10px 0', whiteSpace: 'pre-wrap', color: '#00ffc0' }}>
                {`SYSTEM STATUS: ONLINE
INITIATING CRITICAL UPDATE...
[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}]`}
              </pre>
              <div style={{
                background: '#0a0a0a',
                border: '1px solid #00ffc0',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '15px',
                minHeight: '80px', // Ensure it has some height
                display: 'flex',
                alignItems: 'center',
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4', color: '#00ffc0' }}>
                  {`> Processing: ${currentFile}
> Estimated completion: ${formatTime(timeLeft)}`}
                </pre>
              </div>

              <div style={{ width: '100%', background: '#3c3c3c', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ffc0, #00cc99)',
                  transition: 'width 2.7s linear', // Match the progress interval for smooth fill
                  boxShadow: '0 0 8px rgba(0,255,192,0.5)',
                  borderRadius: '4px',
                }} />
              </div>
              <p style={{ marginTop: '10px', textAlign: 'center', color: '#00cc99', fontSize: '12px' }}>
                {progress}% Complete - {message}
              </p>
            </>
          ) : (
            // Status === 'complete'
            <div style={{ textAlign: 'center' }}>
              <pre style={{ margin: '0 0 20px 0', whiteSpace: 'pre-wrap', color: '#00ffc0', fontSize: '18px' }}>
                {`UPDATE COMPLETE.
NEW SYSTEM VERSION DEPLOYED.`}
              </pre>
              <p style={{ margin: '0 0 30px 0', color: '#00cc99', fontSize: '16px' }}>
                Ready for launch. Press 'Enter' to experience the latest features.
              </p>
              <button
                onClick={onEnter}
                style={{
                  background: 'linear-gradient(45deg, #00ffc0, #00cc99)',
                  border: '2px solid #00ffc0',
                  borderRadius: '8px',
                  padding: '15px 30px',
                  color: '#000',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: `"Fira Code", monospace`,
                  boxShadow: '0 0 15px rgba(0,255,192,0.7)',
                  fontSize: '18px',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(0,255,192,1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,192,0.7)';
                }}
              >
                Enter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}