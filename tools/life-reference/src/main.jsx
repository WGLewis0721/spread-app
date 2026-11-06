import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
const { default: Application } = location.pathname.startsWith('/iphone')
  ? await import('./iphone/PhonePreview')
  : await import('./App');
createRoot(document.getElementById('root')).render(<Application/>);
