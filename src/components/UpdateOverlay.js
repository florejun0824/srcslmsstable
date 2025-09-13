import React, { useState, useEffect } from 'react';

// ✅ RESPONSIVE: A simple hook to check for screen size.
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
};

export default function UpdateOverlay({ status, timeLeft, onEnter }) {
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [message, setMessage] = useState('');
  const isMobile = useIsMobile(); // Use the hook

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
      setProgress(0);
      setCurrentFile(files[0]);
      setMessage("Preparing update...");
      progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 99));
      }, 2700); 

      let fileIndex = 0;
      fileInterval = setInterval(() => {
        if (fileIndex < files.length - 1) {
          fileIndex++;
          setCurrentFile(files[fileIndex]);
          setMessage(files[fileIndex]);
        }
      }, 27000);

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

  // ✅ RESPONSIVE: Define styles that will change based on screen size
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px',
    maxWidth: '800px',
    width: '90%',
    padding: isMobile ? '20px' : '40px', // Less padding on mobile
    background: 'rgba(0,255,192,0.05)',
    border: '2px solid #00ffc0',
    borderRadius: '12px',
    boxShadow: '0 0 30px rgba(0,255,192,0.3)',
    position: 'relative',
  };

  const imageStyle = {
    height: isMobile ? '140px' : '180px', // Smaller image on mobile
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 10px rgba(0,255,192,0.8))',
    marginBottom: '20px',
  };

  const completeHeaderStyle = {
    margin: '0 0 20px 0',
    whiteSpace: 'pre-wrap',
    color: '#00ffc0',
    fontSize: isMobile ? '16px' : '18px', // Smaller font on mobile
  };

  const buttonStyle = {
    background: 'linear-gradient(45deg, #00ffc0, #00cc99)',
    border: '2px solid #00ffc0',
    borderRadius: '8px',
    padding: isMobile ? '12px 24px' : '15px 30px', // Smaller padding on mobile
    color: '#000',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: `"Fira Code", monospace`,
    boxShadow: '0 0 15px rgba(0,255,192,0.7)',
    fontSize: isMobile ? '16px' : '18px', // Smaller font on mobile
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    textTransform: 'uppercase',
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
        color: '#00ffc0',
        overflow: 'hidden',
        fontSize: '14px',
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(#00ffc033 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        opacity: 0.1,
      }} />

      {/* ✅ RESPONSIVE: Applied conditional style */}
      <div style={containerStyle}>
        {/* ✅ RESPONSIVE: Applied conditional style */}
        <img
          src="/characters/guide 2.png"
          alt="Update Assistant"
          style={imageStyle}
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
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4', color: '#00ffc0', fontSize: isMobile ? '12px' : '14px' }}>
                  {`> Processing: ${currentFile}
> Estimated completion: ${formatTime(timeLeft)}`}
                </pre>
              </div>

              <div style={{ width: '100%', background: '#3c3c3c', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ffc0, #00cc99)',
                  transition: 'width 2.7s linear',
                  boxShadow: '0 0 8px rgba(0,255,192,0.5)',
                  borderRadius: '4px',
                }} />
              </div>
              <p style={{ marginTop: '10px', textAlign: 'center', color: '#00cc99', fontSize: '12px' }}>
                {progress}% Complete - {message}
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              {/* ✅ RESPONSIVE: Applied conditional style */}
              <pre style={completeHeaderStyle}>
                {`UPDATE COMPLETE.
NEW SYSTEM VERSION DEPLOYED.`}
              </pre>
              <p style={{ margin: '0 0 30px 0', color: '#00cc99', fontSize: isMobile ? '14px' : '16px' }}>
                Ready for launch. Press 'Enter' to experience the latest features.
              </p>
              {/* ✅ RESPONSIVE: Applied conditional style */}
              <button
                onClick={onEnter}
                style={buttonStyle}
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