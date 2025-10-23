// src/plugins.js
import { registerPlugin } from '@capacitor/core';

// This registers the 'AntiCheatPlugin' from your Java code
// so you can import and use it in your React code.
export const AntiCheatPlugin = registerPlugin('AntiCheatPlugin');