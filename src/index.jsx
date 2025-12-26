import "./polyfills"; // ✅ MUST be first

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ThemeProvider } from "./contexts/ThemeContext"; // <-- 1. IMPORT
import SchoolBrandingHandler from "./components/common/SchoolBrandingHandler";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider> {/* <-- 2. WRAP YOUR APP */}
      <AuthProvider>
	<SchoolBrandingHandler />
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider> {/* <-- 3. CLOSE WRAPPER */}
  </React.StrictMode>
);