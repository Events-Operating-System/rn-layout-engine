import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ── DEBUG-0014: JS execution marker ──────────────────────────────────────────
// Runs before React. Visible even if React crashes or CSS fails.
// Remove after iPhone diagnosis is confirmed fixed.
;(function () {
  const d = document.createElement('div')
  d.id = '__dbg_js'
  d.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0',
    'background:#22c55e', 'color:#000', 'padding:6px 10px',
    'z-index:999999', 'font-size:11px', 'font-family:monospace',
    'word-break:break-all', 'line-height:1.4',
  ].join(';')
  d.textContent = `JS OK | ${window.innerWidth}×${window.innerHeight} | dpr:${window.devicePixelRatio} | ${navigator.userAgent.slice(0, 60)}`
  document.body.appendChild(d)
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
