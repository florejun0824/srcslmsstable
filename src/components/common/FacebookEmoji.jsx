import React from "react";

/**
 * FacebookEmoji.jsx
 * Glossy 3D-style custom SVGs for Facebook-like reactions
 *
 * Usage:
 *   <FacebookEmoji type="like" size="md" />
 *   Props:
 *     type: "like" | "love" | "haha" | "wow" | "sad" | "angry" | "care"
 *     size: "sm" (20px) | "md" (36px) | "lg" (56px) | number
 */

const SIZE_MAP = { sm: 20, md: 36, lg: 56 };
const getPx = (size) => (typeof size === "number" ? size : SIZE_MAP[size] || SIZE_MAP.md);

const SVG = ({ size, label, children }) => {
  const px = getPx(size);
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={label}
      role="img"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      {children}
    </svg>
  );
};

/* ---------- Individual Emojis ---------- */

// LIKE 👍
const LikeSVG = ({ size }) => (
  <SVG size={size} label="Like">
    <defs>
      <radialGradient id="g_like" cx="30%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#8fc6ff" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#g_like)" />
    <path
      d="M23 43H16c-1.1 0-2-1-2-2V29c0-1 .9-2 2-2h7v16zm6-16c0-3 2-6 4-9 1-1.8 3-3 4-3 1.2 0 2 1 2 2v6c0 .7-.4 1.6-1 2l-3 3v12c0 1.1-.9 2-2 2H30c-1 0-2-.9-2-2V27z"
      fill="#fff"
    />
  </SVG>
);

// LOVE ❤️
const LoveSVG = ({ size }) => (
  <SVG size={size} label="Love">
    <defs>
      <radialGradient id="g_love" cx="30%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#ffc1d1" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#g_love)" />
    <path
      d="M32 46s-9-6-14-11c-3-3-3-8 0-11 3-3 8-3 11 0l3 3 3-3c3-3 8-3 11 0 3 3 3 8 0 11-5 5-14 11-14 11z"
      fill="#fff"
    />
  </SVG>
);

// HAHA 😆
const HahaSVG = ({ size }) => (
  <SVG size={size} label="Haha">
    <defs>
      <radialGradient id="g_haha" cx="30%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#fff7cc" />
        <stop offset="50%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#g_haha)" />
    <path d="M21 26c2-2 6-2 8 0M38 26c2-2 6-2 8 0" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M20 38c8 8 16 8 24 0" stroke="#111" strokeWidth="3" strokeLinecap="round" />
  </SVG>
);

// WOW 😮
const WowSVG = ({ size }) => (
  <SVG size={size} label="Wow">
    <defs>
      <radialGradient id="g_wow" cx="30%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#fff7cc" />
        <stop offset="50%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#g_wow)" />
    <circle cx="24" cy="26" r="3" fill="#111" />
    <circle cx="40" cy="26" r="3" fill="#111" />
    <ellipse cx="32" cy="40" rx="6" ry="8" fill="#111" />
  </SVG>
);

// SAD 😢
const SadSVG = ({ size }) => (
  <SVG size={size} label="Sad">
    <defs>
      <radialGradient id="g_sad" cx="30%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#fff7cc" />
        <stop offset="50%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#g_sad)" />
    <circle cx="24" cy="26" r="3" fill="#111" />
    <circle cx="40" cy="26" r="3" fill="#111" />
    <path d="M22 44c3-3 7-4 10-4s7 1 10 4" stroke="#111" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="22" cy="32" rx="2" ry="4" fill="#3b82f6" />
  </SVG>
);

// ANGRY 😡
const AngrySVG = ({ size }) => (
  <SVG size={size} label="Angry">
    <defs>
      <radialGradient id="g_angry" cx="40%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ffb0b8" />
        <stop offset="60%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#g_angry)" />
    <path d="M24 28c2-2 6-3 8-3s6 1 8 3" stroke="#111" strokeWidth="3" strokeLinecap="round" />
    <circle cx="24" cy="32" r="3" fill="#111" />
    <circle cx="40" cy="32" r="3" fill="#111" />
    <path d="M22 44c4-3 12-3 18 0" stroke="#111" strokeWidth="3" strokeLinecap="round" />
  </SVG>
);

// CARE 🤗
const CareSVG = ({ size }) => (
  <SVG size={size} label="Care">
    <defs>
      <radialGradient id="g_care" cx="30%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#fff7cc" />
        <stop offset="50%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
      <radialGradient id="g_care_heart" cx="30%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#ffc1d1" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#g_care)" />
    <path
      d="M32 44s-7-5-10-8c-2-2-2-6 0-8s6-2 8 0l2 2 2-2c2-2 6-2 8 0s2 6 0 8c-3 3-10 8-10 8z"
      fill="url(#g_care_heart)"
    />
    <circle cx="24" cy="26" r="3" fill="#111" />
    <circle cx="40" cy="26" r="3" fill="#111" />
  </SVG>
);

const FacebookEmoji = ({ type = "like", size = "md", className = "" }) => {
  const map = {
    like: LikeSVG,
    love: LoveSVG,
    haha: HahaSVG,
    wow: WowSVG,
    sad: SadSVG,
    angry: AngrySVG,
    care: CareSVG,
  };
  const Comp = map[type] || map.like;
  return (
    <span className={className} style={{ display: "inline-block", lineHeight: 0 }}>
      <Comp size={size} />
    </span>
  );
};

export default FacebookEmoji;
