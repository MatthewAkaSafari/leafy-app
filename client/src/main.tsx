import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { offlineStore } from './lib/db';
import { setupOfflineSync } from './lib/offline-sync';

// Initialize offline storage
offlineStore.initialize().then(() => {
  console.log('Offline storage initialized');
});

// Setup offline sync
setupOfflineSync();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);