import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializePWA, optimizeForMobile } from "./lib/pwa";

// Initialize PWA functionality
initializePWA();
optimizeForMobile();

createRoot(document.getElementById("root")!).render(<App />);
