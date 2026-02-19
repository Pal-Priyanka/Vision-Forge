import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const rootElement = document.getElementById("root");

if (rootElement) {
    createRoot(rootElement).render(<App />);
} else {
    console.error("BOOT CRITICAL: NO ROOT ELEMENT");
}

