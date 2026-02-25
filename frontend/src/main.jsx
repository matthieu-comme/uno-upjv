import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render( // createRoot est la nouvelle API de React 18 pour le rendu
  <StrictMode>
    <App /> 
  </StrictMode>,
)
