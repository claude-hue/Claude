/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

// Push event handler — triggered when a push notification is received
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data: { title?: string; body?: string; url?: string; icon?: string } = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: event.data.text() }
  }

  const title = data.title ?? 'New Notification'
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: data.icon ?? '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: data.url ?? '/' },
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click — focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl: string = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if already open
        const existingClient = clientList.find(
          (client) => client.url === targetUrl && 'focus' in client
        )
        if (existingClient) {
          return existingClient.focus()
        }
        // Open a new window
        return self.clients.openWindow(targetUrl)
      })
  )
})

// Push subscription change — re-subscribe when the browser rotates keys
self.addEventListener('pushsubscriptionchange', (event) => {
  const pushEvent = event as PushSubscriptionChangeEvent
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: pushEvent.oldSubscription?.options.applicationServerKey,
      })
      .then((newSubscription) => {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSubscription.toJSON()),
        })
      })
  )
})
