import React from 'react';
import ReactDOM from 'react-dom/client';
import EcommerceApp from './App'; // The default export from your App.js

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <EcommerceApp />
  </React.StrictMode>
);