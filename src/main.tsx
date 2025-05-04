
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Get the root element
const rootElement = document.getElementById("root");

// Ensure we have a root element before rendering
if (!rootElement) {
  throw new Error("Root element not found. Make sure there is an element with id 'root' in your HTML.");
}

// Create a root and render the app
const root = createRoot(rootElement);

// Render the app within the root
root.render(<App />);
