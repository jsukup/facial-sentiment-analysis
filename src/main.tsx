
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry error tracking
initSentry();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
  