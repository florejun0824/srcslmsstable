import React, { useState, useEffect, useMemo } from 'react';

// NEW: Custom hook for the typing effect
const useTypingEffect = (text, speed = 50, start = true) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!start || !text) {
      setDisplayedText('');
      return;
    };

    setDisplayedText(''); // Reset on text change
    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(prev => prev + text.charAt(i));
      i++;
      if (i > text.length) {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed, start]);

  return displayedText;
};

// NEW: Blinking cursor component
const BlinkingCursor = () => <span className="blinking-cursor">|</span>;

// ENHANCEMENT: Added userName and userRole props for personalization
export default function UpdateOverlay({ status, timeLeft, onEnter, userName = "Operator", userRole }) {
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [showButton, setShowButton] = useState(false);

  // ENHANCEMENT: More interesting "hacker" style file names
  const files = useMemo(() => [
    "Initializing quantum handshake...",
    "Calibrating neural network...",
    "Decompressing asset archives...",
    "Compiling shader modules...",
    "Routing through proxy layer 7...",
    "Bypassing mainframe security...",
    "Verifying data integrity (SHA-256)...",
    "Injecting core dependencies...",
    "Finalizing system integration...",
    "Purging cache and temporary files...",
    "Rebooting command services...",
    "System update successful. Launching..."
  ], []);

  // NEW: Create a personalized greeting message
  const greetingMessage = useMemo(() => {
    if (!userName) return null;

    let rolePrefix = '';
    // Check for specific roles and format the greeting accordingly
    if (userRole && (userRole.toLowerCase() === 'teacher' || userRole.toLowerCase() === 'admin')) {
        rolePrefix = `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} `;
    }

    return `Hey ${rolePrefix}${userName}, a system update is underway.`;
  }, [userName, userRole]);


  const currentFile = files[currentFileIndex];
  const typedFile = useTypingEffect(currentFile, 30, status === 'building');
  const finalMessage = "Ready for launch. Press 'Enter' to experience the latest features.";
  const typedFinalMessage = useTypingEffect(finalMessage, 25, status === 'complete');
  
  useEffect(() => {
    let fileInterval;
    if (status === 'building') {
      setCurrentFileIndex(0);
      fileInterval = setInterval(() => {
        setCurrentFileIndex(prev => (prev < files.length - 1 ? prev + 1 : prev));
      }, 4000); // ENHANCEMENT: Faster file switching for more dynamic feel
    } else if (status === 'complete') {
      setCurrentFileIndex(files.length - 1);
      // Show the button after the final message is typed
      const buttonTimeout = setTimeout(() => setShowButton(true), finalMessage.length * 25 + 500);
      return () => clearTimeout(buttonTimeout);
    }

    return () => clearInterval(fileInterval);
  }, [status, files.length, finalMessage.length]);
  
  // ENHANCEMENT: Allow user to press the 'Enter' key to proceed
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && status === 'complete' && showButton) {
        onEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, onEnter, showButton]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const progress = status === 'building' ? (currentFileIndex / (files.length -1)) * 100 : 100;

  return (
    <>
      {/* NEW: Component-scoped CSS for animations */}
      <style>{`
        .update-overlay-fade-in { animation: fadeIn 1s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .scanline {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%);
          background-size: 100% 8px;
          animation: scan 10s linear infinite;
          pointer-events: none;
        }
        @keyframes scan { from { background-position: 0 0; } to { background-position: 0 400px; } }
        
        .character-bob { animation: bob 4s ease-in-out infinite; }
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

        .blinking-cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { from, to { color: transparent; } 50% { color: #00ffc0; } }
        
        .pulse-button { animation: pulse 2s infinite; }
        @keyframes pulse {
          0% { box-shadow: 0 0 15px rgba(0,255,192,0.7); }
          50% { box-shadow: 0 0 30px rgba(0,255,192,1); }
          100% { box-shadow: 0 0 15px rgba(0,255,192,0.7); }
        }
      `}</style>

      <div
        className="update-overlay-fade-in"
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
        <div className="scanline" /> {/* NEW: Scanline effect */}
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
            background: 'rgba(0,255,192,0.05)',
            border: '2px solid #00ffc0',
            borderRadius: '12px',
            boxShadow: '0 0 30px rgba(0,255,192,0.3)',
            position: 'relative',
          }}
        >
          <img
            src="/characters/guide 2.png"
            alt="Update Assistant"
            className="character-bob" // NEW: Character animation
            style={{
              height: '180px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 10px rgba(0,255,192,0.8))',
              marginBottom: '20px',
            }}
          />

          {/* NEW: Display personalized greeting during the update process */}
          {status === 'building' && greetingMessage && (
            <p style={{
                fontSize: '18px',
                color: '#ffffff',
                textShadow: '0 0 5px rgba(0,255,192,0.7)',
                marginBottom: '0px', // Adjusted margin
                paddingBottom: '25px',
                textAlign: 'center',
                borderBottom: '1px solid rgba(0,255,192,0.2)',
                width: '100%'
            }}>
                {greetingMessage}
            </p>
          )}

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
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4', color: '#00ffc0' }}>
                    {`> Processing: ${typedFile}`}<BlinkingCursor />
                    {`\n> Estimated completion: ${formatTime(timeLeft)}`}
                  </pre>
                </div>

                <div style={{ width: '100%', background: '#3c3c3c', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #00ffc0, #00cc99)',
                    transition: 'width 0.5s linear', // ENHANCEMENT: Smoother progress bar
                    boxShadow: '0 0 8px rgba(0,255,192,0.5)',
                    borderRadius: '4px',
                  }} />
                </div>
                <p style={{ marginTop: '10px', textAlign: 'center', color: '#00cc99', fontSize: '12px', height: '18px' }}>
                  {Math.round(progress)}% Complete
                </p>
              </>
            ) : (
              // Status === 'complete'
              <div style={{ textAlign: 'center' }}>
                <pre style={{ margin: '0 0 20px 0', whiteSpace: 'pre-wrap', color: '#00ffc0', fontSize: '18px' }}>
                  {`UPDATE COMPLETE.
NEW SYSTEM VERSION DEPLOYED.`}
                </pre>
                <p style={{ margin: '0 0 30px 0', color: '#00cc99', fontSize: '16px', minHeight: '48px' }}>
                  {typedFinalMessage}{status === 'complete' && !showButton ? <BlinkingCursor /> : ''}
                </p>
                
                {showButton && (
                  <button
                    onClick={onEnter}
                    className="pulse-button" // NEW: Button animation
                    style={{
                      background: 'linear-gradient(45deg, #00ffc0, #00cc99)',
                      border: '2px solid #00ffc0',
                      borderRadius: '8px',
                      padding: '15px 30px',
                      color: '#000',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontFamily: `"Fira Code", monospace`,
                      fontSize: '18px',
                      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      textTransform: 'uppercase',
                      opacity: showButton ? 1 : 0,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 0 25px rgba(0,255,192,1)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Enter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}