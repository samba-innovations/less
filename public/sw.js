// Service Worker — samba innovations (less)
const VERSION       = 'samba-less-v1'
const STATIC_CACHE  = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`
const OFFLINE_URL = '/offline'
const PRECACHE = ['/offline', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icon-') ||
      url.pathname.startsWith('/identidade/') || url.pathname === '/manifest.json') {
    event.respondWith(cacheFirst(req)); return
  }
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstHtml(req)); return
  }
  event.respondWith(fetch(req).catch(() => caches.match(req)))
})
async function cacheFirst(req) {
  const cached = await caches.match(req); if (cached) return cached
  const res = await fetch(req)
  if (res.ok) { const c = await caches.open(STATIC_CACHE); c.put(req, res.clone()) }
  return res
}
async function networkFirstHtml(req) {
  try {
    const res = await fetch(req)
    if (res.ok) { const c = await caches.open(RUNTIME_CACHE); c.put(req, res.clone()) }
    return res
  } catch { return (await caches.match(req)) || caches.match(OFFLINE_URL) }
}
self.addEventListener('push', event => {
  if (!event.data) return
  try {
    const data = event.data.json()
    event.waitUntil(self.registration.showNotification(data.title ?? 'samba innovations', {
      body: data.body, icon: '/icon-192.png', badge: '/icon-192.png',
      data: data.url ? { url: data.url } : undefined,
    }))
  } catch {}
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(clients => {
    const existing = clients.find(c => c.url.includes(url))
    if (existing) return existing.focus()
    return self.clients.openWindow(url)
  }))
})
