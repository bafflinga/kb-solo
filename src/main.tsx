import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { unlockAudio } from './audio/audio'
import './styles/base.css'
import './styles/app.css'

function requestAudioUnlock(): void {
  window.removeEventListener('pointerdown', requestAudioUnlock, true)
  window.removeEventListener('keydown', requestAudioUnlock, true)
  void unlockAudio()
}

window.addEventListener('pointerdown', requestAudioUnlock, true)
window.addEventListener('keydown', requestAudioUnlock, true)

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element #root not found')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
