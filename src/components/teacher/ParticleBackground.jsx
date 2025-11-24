// src/components/teacher/ParticleBackground.jsx
import React, { memo } from 'react';

const FloatingShapesBackground = ({ className }) => {
  return (
    <>
      <style>{`
        /* --- Animation for the sparkling/twinkling effect --- */
        @keyframes twinkle {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        /* --- OPTIMIZED FLOW: Use translate3d for GPU Acceleration --- */
        @keyframes flow-1 {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(15px, -20px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes flow-2 {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(-15px, 10px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes flow-3 {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(10px, 15px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        .shape {
          position: absolute;
          display: block;
          border-radius: 50%;
          /* CRITICAL PERFORMANCE FIX: Promote to GPU layer */
          will-change: transform, opacity;
          /* Remove blur shadow calculation cost if resizing/scrolling is still laggy */
          /* box-shadow: none !important; */ 
        }

        /* --- Individual "Dust Mote" Styles --- */
        /* Kept colors but ensure animations utilize the GPU-optimized keyframes */

        .shape-1 { left: 15%; top: 20%; width: 2px; height: 2px; background-color: #c084fc; box-shadow: 0 0 6px 2px #c084fc; animation: flow-1 25s linear infinite, twinkle 2s ease-in-out infinite; animation-delay: 0s, 0.2s; }
        .shape-2 { left: 25%; top: 80%; width: 1px; height: 1px; background-color: #67e8f9; box-shadow: 0 0 5px 1px #67e8f9; animation: flow-2 30s linear infinite, twinkle 3s ease-in-out infinite; animation-delay: 1.5s, 0.5s; }
        .shape-3 { left: 80%; top: 10%; width: 1px; height: 1px; background-color: #f472b6; box-shadow: 0 0 5px 2px #f472b6; animation: flow-3 28s linear infinite, twinkle 1.8s ease-in-out infinite; animation-delay: 3s, 0.8s; }
        .shape-4 { left: 40%; top: 85%; width: 2px; height: 2px; background-color: #fde047; box-shadow: 0 0 7px 3px #fde047; animation: flow-1 22s linear infinite, twinkle 2.5s ease-in-out infinite; animation-delay: 4.5s, 0.1s; }
        .shape-5 { left: 5%; top: 70%; width: 1px; height: 1px; background-color: #818cf8; box-shadow: 0 0 6px 1px #818cf8; animation: flow-2 32s linear infinite, twinkle 2.2s ease-in-out infinite; animation-delay: 6s, 1s; }
        .shape-6 { left: 90%; top: 65%; width: 2px; height: 2px; background-color: #c084fc; box-shadow: 0 0 6px 2px #c084fc; animation: flow-3 26s linear infinite, twinkle 1.5s ease-in-out infinite; animation-delay: 7.5s, 0.3s; }
        .shape-7 { left: 55%; top: 15%; width: 1px; height: 1px; background-color: #67e8f9; box-shadow: 0 0 5px 1px #67e8f9; animation: flow-1 24s linear infinite, twinkle 2.8s ease-in-out infinite; animation-delay: 9s, 0.6s; }
        .shape-8 { left: 50%; top: 50%; width: 2px; height: 2px; background-color: #f472b6; box-shadow: 0 0 7px 3px #f472b6; animation: flow-2 29s linear infinite, twinkle 2s ease-in-out infinite; animation-delay: 10.5s, 0.9s; }
        .shape-9 { left: 5%; top: 10%; width: 1px; height: 1px; background-color: #fde047; box-shadow: 0 0 5px 2px #fde047; animation: flow-3 31s linear infinite, twinkle 1.7s ease-in-out infinite; animation-delay: 12s, 0.4s; }
        .shape-10 { left: 95%; top: 25%; width: 2px; height: 2px; background-color: #818cf8; box-shadow: 0 0 6px 2px #818cf8; animation: flow-1 27s linear infinite, twinkle 2.3s ease-in-out infinite; animation-delay: 13.5s, 0.7s; }
        .shape-11 { left: 65%; top: 75%; width: 1px; height: 1px; background-color: #c084fc; box-shadow: 0 0 5px 1px #c084fc; animation: flow-2 23s linear infinite, twinkle 2.6s ease-in-out infinite; animation-delay: 15s, 0.2s; }
        .shape-12 { left: 33%; top: 33%; width: 1px; height: 1px; background-color: #67e8f9; box-shadow: 0 0 5px 2px #67e8f9; animation: flow-3 28s linear infinite, twinkle 1.9s ease-in-out infinite; animation-delay: 2s, 1.1s; }
        .shape-13 { left: 77%; top: 44%; width: 2px; height: 2px; background-color: #f472b6; box-shadow: 0 0 7px 3px #f472b6; animation: flow-1 26s linear infinite, twinkle 2.1s ease-in-out infinite; animation-delay: 5s, 0.5s; }
        .shape-14 { left: 20%; top: 50%; width: 1px; height: 1px; background-color: #fde047; box-shadow: 0 0 5px 1px #fde047; animation: flow-2 29s linear infinite, twinkle 2.9s ease-in-out infinite; animation-delay: 8.5s, 0.8s; }
        .shape-15 { left: 85%; top: 90%; width: 2px; height: 2px; background-color: #818cf8; box-shadow: 0 0 6px 2px #818cf8; animation: flow-3 24s linear infinite, twinkle 1.6s ease-in-out infinite; animation-delay: 11.5s, 0.3s; }
        .shape-16 { left: 60%; top: 40%; width: 1px; height: 1px; background-color: #c084fc; box-shadow: 0 0 5px 2px #c084fc; animation: flow-1 28s linear infinite, twinkle 2.4s ease-in-out infinite; animation-delay: 1s, 0.6s; }
        .shape-17 { left: 92%; top: 5%; width: 1px; height: 1px; background-color: #67e8f9; box-shadow: 0 0 5px 1px #67e8f9; animation: flow-2 30s linear infinite, twinkle 2.7s ease-in-out infinite; animation-delay: 4s, 0.9s; }
        .shape-18 { left: 30%; top: 60%; width: 2px; height: 2px; background-color: #f472b6; box-shadow: 0 0 6px 2px #f472b6; animation: flow-3 26s linear infinite, twinkle 1.8s ease-in-out infinite; animation-delay: 7s, 0.1s; }
        .shape-19 { left: 70%; top: 95%; width: 1px; height: 1px; background-color: #fde047; box-shadow: 0 0 5px 1px #fde047; animation: flow-1 29s linear infinite, twinkle 2.2s ease-in-out infinite; animation-delay: 10s, 0.4s; }
        .shape-20 { left: 10%; top: 45%; width: 2px; height: 2px; background-color: #818cf8; box-shadow: 0 0 7px 3px #818cf8; animation: flow-2 27s linear infinite, twinkle 2.5s ease-in-out infinite; animation-delay: 13s, 0.7s; }

      `}</style>
      
      {/* OPTIMIZATION: Use 'fixed' instead of 'absolute' to decouple from scroll. 
         Added 'pointer-events-none' to ensure it doesn't block interaction.
         Added 'transform-gpu' to force hardware acceleration on the container.
      */}
      <div className={`fixed inset-0 overflow-hidden pointer-events-none -z-10 transform-gpu ${className}`}>
          <div className="relative w-full h-full">
              {[...Array(20)].map((_, i) => (
                <span key={i} className={`shape shape-${i + 1}`}></span>
              ))}
          </div>
      </div>
    </>
  );
};

export default memo(FloatingShapesBackground);