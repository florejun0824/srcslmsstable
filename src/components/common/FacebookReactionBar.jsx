import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FacebookEmoji from "./FacebookEmoji";

// ---- Base64 audio (subtle pop/bubble sounds) ----
const hoverSound = new Audio(
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAA... (shortened for clarity, I’ll paste full if you want)"
);
const selectSound = new Audio(
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAA... (shortened for clarity, I’ll paste full if you want)"
);

const reactions = ["like", "love", "haha", "wow", "sad", "angry", "care"];

const FacebookReactionBar = ({ onSelect }) => {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseDown = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), 400); // long press opens bar
  };

  const handleMouseUp = () => {
    clearTimeout(timeoutRef.current);
    if (!open) {
      // quick click = like
      selectSound.currentTime = 0;
      selectSound.play();
      onSelect?.("like");
    }
    setOpen(false);
  };

  const handleHover = () => {
    hoverSound.currentTime = 0;
    hoverSound.play();
  };

  return (
    <div className="relative inline-block">
      {/* Like button (default click) */}
      <motion.div
        className="cursor-pointer select-none"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        <FacebookEmoji type="like" size="md" />
      </motion.div>

      {/* Expanded reactions */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full mb-2 flex gap-2 bg-white rounded-full px-3 py-2 shadow-lg"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {reactions.map((r, i) => (
              <motion.div
                key={r}
                onHoverStart={handleHover}
                onClick={() => {
                  selectSound.currentTime = 0;
                  selectSound.play();
                  onSelect?.(r);
                  setOpen(false);
                }}
                whileHover={{ scale: 1.4, y: -10, boxShadow: "0px 4px 12px rgba(0,0,0,0.25)" }}
                whileTap={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <FacebookEmoji type={r} size="lg" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FacebookReactionBar;
