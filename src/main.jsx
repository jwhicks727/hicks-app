import React from 'react'
import { createRoot } from 'react-dom/client'
// The app's own stylesheet first, so a place's stylesheet wins a tie with it.
import './styles.css'
import App from './App.jsx'
import { applyPrefs } from './lib/prefs.js'
import { blockPageZoom } from './lib/noZoom.js'

applyPrefs()
blockPageZoom()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
