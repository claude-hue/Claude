'use client'

import { useState, useEffect, useCallback } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)))
}

function detectIOSVersion(): number {
  const match = navigator.userAgent.match(/OS (\d+)_/)
  return match ? parseInt(match[1], 10) : 0
}

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PushNotificationState {
  isSupported: boolean
  isIOS: boolean
  isStandalone: boolean
  iosVersion: number
  permissionState: PermissionState
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function usePushNotifications(): PushNotificationState {
  const [isSupported, setIsSupported] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [iosVersion, setIosVersion] = useState(0)
  const [permissionState, setPermissionState] = useState<PermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    const version = ios ? detectIOSVersion() : 0

    setIsIOS(ios)
    setIsStandalone(standalone)
    setIosVersion(version)

    const supported = 'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setIsSupported(supported)

    if (supported) {
      setPermissionState(Notification.permission as PermissionState)

      // Check if already subscribed
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub)
        })
      })
    } else {
      setPermissionState('unsupported')
    }
  }, [])

  const subscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Request notification permission — must be triggered by user gesture
      const permission = await Notification.requestPermission()
      setPermissionState(permission as PermissionState)

      if (permission !== 'granted') {
        setError('Notification permission denied. Please enable it in your device settings.')
        return
      }

      // Get VAPID public key
      const keyRes = await fetch('/api/vapid-public-key')
      const { publicKey } = await keyRes.json()

      if (!publicKey) {
        throw new Error('VAPID public key not available')
      }

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      // Save subscription to server
      const subJson = subscription.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save subscription to server')
      }

      setIsSubscribed(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        setIsSubscribed(false)
        return
      }

      // Remove from server first
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })

      // Unsubscribe from browser
      await subscription.unsubscribe()
      setIsSubscribed(false)
      setPermissionState('default')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unsubscribe'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isSupported,
    isIOS,
    isStandalone,
    iosVersion,
    permissionState,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  }
}
