import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181f',
            color: '#f0f4ff',
            border: '1px solid #2d2d3a',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#3355ff', secondary: '#f0f4ff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#f0f4ff' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
