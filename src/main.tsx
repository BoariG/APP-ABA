import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ClinicalStateProvider } from './context/ClinicalStateContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClinicalStateProvider>
      <App />
    </ClinicalStateProvider>
  </StrictMode>,
);

// Clear any old/broken PWA Service Workers to force immediate refresh of assets and Supabase connections
if ('serviceWorker' in navigator && !localStorage.getItem('pwa_purged_v2')) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      for (const registration of registrations) {
        registration.unregister();
      }
      localStorage.setItem('pwa_purged_v2', 'true');
      window.location.reload();
    } else {
      localStorage.setItem('pwa_purged_v2', 'true');
    }
  });
}
