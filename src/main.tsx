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
