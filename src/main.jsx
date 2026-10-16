import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { isVendorApp } from './config/appMode'
import { initVendorOtaUpdates } from './utils/otaUpdater'
import { preRegisterDeviceTokenOnBoot } from './utils/pushNotifications'
import './index.css'
import App from './App.jsx'

// Over-the-air updates for Vendor/Partner app
if (Capacitor.isNativePlatform()) {
  preRegisterDeviceTokenOnBoot().catch(() => {})
  if (isVendorApp) {
    initVendorOtaUpdates().catch(() => {})
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
