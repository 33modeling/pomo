import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { initTheme } from './store/themeStore'
import { initLang } from './i18n'
import './index.css'

// Apply persisted theme + accent + language before render.
initTheme()
initLang()

// Register the service worker so the app works offline and updates itself.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
