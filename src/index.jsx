// src/index.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';

// ✅ Safe global polyfills
import { Buffer } from 'buffer';

// Runtime polyfills for browser
if (typeof window !== "undefined") {
  if (typeof window.Buffer === "undefined") {
    window.Buffer = Buffer;
  }
  if (typeof window.process === "undefined") {
    window.process = { env: {} }; // prevents "process is not defined"
  }
  if (typeof window.global === "undefined") {
    window.global = window; // prevents "global is not defined"
  }
  if (typeof window.QUOTE === "undefined") {
    window.QUOTE = '"';
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
