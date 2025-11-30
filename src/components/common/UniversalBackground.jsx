// src/components/common/UniversalBackground.jsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './SeasonalEffects.css';

const UniversalBackground = () => {
  const { activeOverlay } = useTheme();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0f1115]">
      
      {/* ==============================================
          1. BASE LAYER (Dark Aurora)
         ============================================== */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${activeOverlay !== 'none' ? 'opacity-0' : 'opacity-100'}`}>
         <div className="absolute inset-0 bg-[#0f1115]" />
         <div className="absolute inset-0 opacity-40"
             style={{
                 backgroundImage: `radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.15) 0px, transparent 50%),
                                   radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.15) 0px, transparent 50%)`
             }}
        />
      </div>

      {/* ==============================================
          2. CHRISTMAS THEME
         ============================================== */}
      {activeOverlay === 'christmas' && (
        <div className="absolute inset-0 transition-opacity duration-1000 animate-fade-in">
           <img src="/themes/christmas/manger.png" alt="Christmas" className="absolute inset-0 w-full h-full object-cover opacity-60" />
           <div className="absolute inset-0 bg-[#0f1115]/85 mix-blend-multiply" />
           <ul className="light-rope">{Array.from({ length: 35 }).map((_, i) => <li key={i}></li>)}</ul>
           <div className="snowflakes" aria-hidden="true">{Array.from({ length: 20 }).map((_, i) => <div key={i} className="snowflake">❅</div>)}</div>
        </div>
      )}

      {/* ==============================================
          3. VALENTINES THEME
         ============================================== */}
       {activeOverlay === 'valentines' && (
         <div className="absolute inset-0 transition-opacity duration-1000 animate-fade-in">
            <img src="/themes/valentines/hearts.png" alt="Valentines" className="absolute inset-0 w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a0505] via-[#2a0a10] to-[#0f1115] opacity-90" />
            <div>{Array.from({ length: 10 }).map((_, i) => <div key={i} className="heart-particle">❤</div>)}</div>
         </div>
       )}

      {/* ==============================================
          4. GRADUATION THEME
         ============================================== */}
       {activeOverlay === 'graduation' && (
         <div className="absolute inset-0 transition-opacity duration-1000 animate-fade-in">
            <img src="/themes/graduation/grad.png" alt="Graduation" className="absolute inset-0 w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#2a2500] to-slate-900 opacity-90 mix-blend-multiply" />
            <div>{Array.from({ length: 20 }).map((_, i) => <div key={i} className="confetti"></div>)}</div>
         </div>
       )}

      {/* ==============================================
          5. RAINY THEME
         ============================================== */}
       {activeOverlay === 'rainy' && (
         <div className="absolute inset-0 transition-opacity duration-1000 animate-fade-in">
            <img src="/themes/rainy/rain.png" alt="Rainy" className="absolute inset-0 w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-slate-900/80 mix-blend-multiply" />
            <div>{Array.from({ length: 12 }).map((_, i) => <div key={i} className="raindrop"></div>)}</div>
         </div>
       )}

      {/* ==============================================
          6. CYBERPUNK THEME
         ============================================== */}
       {activeOverlay === 'cyberpunk' && (
         <div className="absolute inset-0 transition-opacity duration-1000 animate-fade-in">
            <img src="/themes/cyberpunk/cyber.png" alt="Cyberpunk" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-purple-950/80 mix-blend-multiply" />
            <div>{Array.from({ length: 7 }).map((_, i) => <div key={i} className="cyber-particle"></div>)}</div>
         </div>
       )}

      {/* ==============================================
          7. SPRING THEME
         ============================================== */}
       {activeOverlay === 'spring' && (
         <div className="absolute inset-0 transition-opacity duration-1000 animate-fade-in">
            <img src="/themes/spring/sakura.png" alt="Spring" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-[#1a0505]/60 mix-blend-multiply" />
            <div>{Array.from({ length: 10 }).map((_, i) => <div key={i} className="petal"></div>)}</div>
         </div>
       )}

      {/* ==============================================
          8. DEEP SPACE THEME
         ============================================== */}
       {activeOverlay === 'space' && (
         <div className="absolute inset-0 transition-opacity duration-1000 animate-fade-in">
            <img src="/themes/space/galaxy.png" alt="Space" className="absolute inset-0 w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-black/50 mix-blend-overlay" />
            <div>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="shooting-star"></div>)}</div>
         </div>
       )}

    </div>
  );
};

export default UniversalBackground;