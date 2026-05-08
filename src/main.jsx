import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { OllamaProvider } from './contexts/OllamaContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OllamaProvider>
      <App />
    </OllamaProvider>
  </StrictMode>,
)