'use client'

import { useState } from 'react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

interface InstallPromptProps {
  /** Show the iOS manual install guide (Share → Add to Home Screen) */
  showIOSGuide?: boolean
}

export function InstallPrompt({ showIOSGuide = false }: InstallPromptProps) {
  const { installPrompt, isInstalled, triggerInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)
  const [iosGuideVisible, setIosGuideVisible] = useState(showIOSGuide)

  // Already installed or user dismissed — nothing to show
  if (isInstalled || dismissed) return null

  // iOS: show manual install guide (no beforeinstallprompt on iOS)
  if (iosGuideVisible) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl p-4 pb-safe">
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Install App for Notifications</h3>
            <button
              onClick={() => {
                setIosGuideVisible(false)
                setDismissed(true)
              }}
              className="text-gray-400 hover:text-gray-600 ml-4 text-xl leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            To enable push notifications on iOS, add this app to your Home Screen:
          </p>
          <ol className="text-sm text-gray-700 space-y-2">
            <li className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Tap the <strong>Share</strong> button (rectangle with arrow) in Safari
            </li>
            <li className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              Open the app from your Home Screen and enable notifications
            </li>
          </ol>
          <p className="text-xs text-gray-400 mt-3">Requires iOS 16.4 or later</p>
        </div>
      </div>
    )
  }

  // Android / Desktop: native browser install prompt
  if (!installPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 max-w-md mx-auto">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">Install App</h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 ml-4 text-xl leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Install this app for a better experience and push notifications.
      </p>
      <button
        onClick={triggerInstall}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        Install
      </button>
    </div>
  )
}
