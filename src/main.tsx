import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import { getInitialTheme } from './components/ThemeToggle';
import './styles.css';

// Apply theme before React renders to avoid a flash of light mode
const initialTheme = getInitialTheme();
if (initialTheme === 'dark') document.documentElement.classList.add('dark');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Analytics />
      <SpeedInsights />
    </BrowserRouter>
  </React.StrictMode>
);

// Register the service worker for offline support and home-screen install.
// Only runs in production builds — dev mode would interfere with HMR.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* registration failure is non-fatal */
    });
  });
}
