/**
 * Application Entry Point
 * 
 * Renders the React application to the DOM.
 * Includes React.StrictMode for development warnings.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);