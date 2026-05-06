import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { db } from './firebase';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';

// Force Cache/State Clear on Version Change
const CURRENT_VERSION = "1.1.3";
const storedVersion = localStorage.getItem('APP_VERSION');

if (storedVersion !== CURRENT_VERSION) {
  console.log(`[Sync] Version mismatch (${storedVersion} -> ${CURRENT_VERSION}). Clearing local state...`);
  
  // Clear Firestore Cache
  const clearCache = async () => {
    try {
      await terminate(db);
      await clearIndexedDbPersistence(db);
      console.log("[Sync] Firestore cache cleared successfully.");
    } catch (err) {
      console.warn("[Sync] Error clearing Firestore cache (usually safe to ignore):", err);
    }
  };

  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('APP_VERSION', CURRENT_VERSION);
  
  // Clear cache and then reload if it's a real update
  if (storedVersion) {
    clearCache().finally(() => {
      window.location.reload();
    });
  } else {
    clearCache();
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
