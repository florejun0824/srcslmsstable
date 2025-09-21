import React from 'react';

const ProgressIndicator = ({ progress = 0 }) => {
  // neumorphism + glassmorphism style constants
  const NEU_BG = 'rgba(238, 242, 245, 0.65)'; // translucent
  const NEU_SHADOW_LIGHT = 'rgba(255,255,255,0.9)';
  const NEU_SHADOW_DARK = 'rgba(163,177,198,0.35)';

  // Bigger frosted glass panel
  const NEU_SCREEN = {
    background: NEU_BG,
    borderRadius: 32,
    boxShadow: `16px 16px 32px ${NEU_SHADOW_DARK}, -16px -16px 32px ${NEU_SHADOW_LIGHT}`,
    padding: '36px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '520px',
    margin: '0 auto',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.35)',
  };

  const NEU_TITLE = {
    color: '#222',
    fontSize: '1.2rem',
    fontWeight: '700',
    marginBottom: '20px',
    textShadow: `1px 1px 2px ${NEU_SHADOW_LIGHT}, -1px -1px 2px ${NEU_SHADOW_DARK}`,
  };

  const NEU_TRACK = {
    background: 'rgba(238, 242, 245, 0.8)',
    borderRadius: 26,
    boxShadow: `inset 8px 8px 16px ${NEU_SHADOW_DARK}, inset -8px -8px 16px ${NEU_SHADOW_LIGHT}`,
    overflow: 'hidden',
    height: '32px',
    width: '100%',
  };

  const NEU_FILL = {
    width: `${progress}%`,
    height: '100%',
    borderRadius: 26,
    background: 'linear-gradient(90deg, #a78bfa, #7c3aed)',
    transition: 'width 0.5s ease-out',
  };

  const NEU_PERCENT = {
    marginTop: '20px',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#333',
    textShadow: `1px 1px 2px ${NEU_SHADOW_LIGHT}, -1px -1px 2px ${NEU_SHADOW_DARK}`,
  };

  return (
    <div style={NEU_SCREEN}>
      <div style={NEU_TITLE}>Progress</div>
      <div style={NEU_TRACK}>
        <div style={NEU_FILL}></div>
      </div>
      <div style={NEU_PERCENT}>
        {`${Math.round(progress)}%`}
      </div>
    </div>
  );
};

export default ProgressIndicator;
