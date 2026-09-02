import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app.js';
import { initializeAuthentication } from './auth-token.js';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Application root element is missing');

const authentication = await initializeAuthentication();
createRoot(rootElement).render(<StrictMode><BrowserRouter><App authentication={authentication} /></BrowserRouter></StrictMode>);
