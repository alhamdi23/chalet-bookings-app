import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import AuthGate from './auth/AuthGate';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);

// Register the service worker for offline support and installability.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch(() => {
      // Service worker registration is best-effort; the app still works online.
    });
  });
}
