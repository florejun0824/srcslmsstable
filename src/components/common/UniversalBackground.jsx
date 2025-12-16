// src/components/common/UniversalBackground.jsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './SeasonalEffects.css';

const UniversalBackground = () => {
  const { activeOverlay, monetTheme } = useTheme();

  return (
    <div 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-1000 ease-in-out" 
        style={{
            backgroundColor: monetTheme.seedHex,
            backgroundImage: `
                radial-gradient(at 0% 0%, rgba(${monetTheme.rgbString}, 0.8) 0px, transparent 50%),
                radial-gradient(at 100% 0%, rgba(${monetTheme.rgbString}, 0.5) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(${monetTheme.rgbString}, 0.3) 0px, transparent 50%)
            `
        }}
    >
      
      {/* NOISE TEXTURE */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} 
      />

      {/* THEME SPECIFIC ASSETS */}
      {/* Note: The gradients are now handled by the parent div style above, 
          so these sections only need to render the specific images/particles. */}

		  {activeOverlay === 'christmas' && (
		          <div className="absolute inset-0 animate-fade-in">
		             {/* Background Image */}
		             <img src="/themes/christmas/manger.png" alt="Christmas" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-soft-light" />
           
		             {/* REMOVED: <ul className="light-rope">...</ul> */}
           
		             {/* Snowflakes (Keep these, they are optimized) */}
		             <div className="snowflakes" aria-hidden="true">{Array.from({ length: 20 }).map((_, i) => <div key={i} className="snowflake">❅</div>)}</div>
		          </div>
		        )}

      {activeOverlay === 'valentines' && (
         <div className="absolute inset-0 animate-fade-in">
            <img src="/themes/valentines/hearts.png" alt="Valentines" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" />
            <div>{Array.from({ length: 10 }).map((_, i) => <div key={i} className="heart-particle">❤</div>)}</div>
         </div>
       )}

      {activeOverlay === 'graduation' && (
         <div className="absolute inset-0 animate-fade-in">
            <img src="/themes/graduation/grad.png" alt="Graduation" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" />
            <div>{Array.from({ length: 20 }).map((_, i) => <div key={i} className="confetti"></div>)}</div>
         </div>
       )}

      {activeOverlay === 'rainy' && (
         <div className="absolute inset-0 animate-fade-in">
            <img src="/themes/rainy/rain.png" alt="Rainy" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" />
            <div>{Array.from({ length: 12 }).map((_, i) => <div key={i} className="raindrop"></div>)}</div>
         </div>
       )}

      {activeOverlay === 'cyberpunk' && (
         <div className="absolute inset-0 animate-fade-in">
            <img src="/themes/cyberpunk/cyber.png" alt="Cyberpunk" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
            <div>{Array.from({ length: 7 }).map((_, i) => <div key={i} className="cyber-particle"></div>)}</div>
         </div>
       )}

      {activeOverlay === 'spring' && (
         <div className="absolute inset-0 animate-fade-in">
            <img src="/themes/spring/sakura.png" alt="Spring" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
            <div>{Array.from({ length: 10 }).map((_, i) => <div key={i} className="petal"></div>)}</div>
         </div>
       )}

      {activeOverlay === 'space' && (
         <div className="absolute inset-0 animate-fade-in">
            <img src="/themes/space/galaxy.png" alt="Space" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen" />
            <div>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="shooting-star"></div>)}</div>
         </div>
       )}

    </div>
  );
};

export default UniversalBackground;