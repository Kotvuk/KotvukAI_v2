import React from 'react';
import { createRoot } from 'react-dom/client';
import { LangProvider } from './LangContext';
import App from './App';
createRoot(document.getElementById('root')).render(<LangProvider><App /></LangProvider>);
