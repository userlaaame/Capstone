import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import { AnomalyProvider } from './context/AnomalyContext.jsx';
import './index.css'
import App from './App.jsx'
import 'leaflet/dist/leaflet.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AnomalyProvider>
          <App />
        </AnomalyProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
