import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import { AnomalyProvider } from './context/AnomalyContext.jsx';
//ORDER MATTERS - vendor stylesheet first, ours second. index.css overrides
//Leaflet's popup/container/control styles with plain single-class selectors,
//which tie Leaflet's own on specificity, so whichever sheet loads LAST wins.
//With these swapped, every one of those overrides silently does nothing.
import 'leaflet/dist/leaflet.css';
import './index.css'
import App from './App.jsx'

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
