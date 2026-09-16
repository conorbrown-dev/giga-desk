import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Root } from './auth0-application.js';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Application root element is missing');

createRoot(rootElement).render(<StrictMode><BrowserRouter><Auth0Root /></BrowserRouter></StrictMode>);
