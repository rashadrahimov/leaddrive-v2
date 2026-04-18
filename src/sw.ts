import { defaultCache } from "@serwist/next/worker"
import { Serwist, NetworkOnly } from "serwist"

declare const self: any

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Map tiles — always fetch from network, never cache via SW
    {
      matcher: /^https:\/\/.*\.(tile\.openstreetmap|basemaps\.cartocdn)\..*\.png$/i,
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
})

serwist.addEventListeners()

// ─── Web Push (§4 option C) ───
// Fires even when the browser window/tab is closed, as long as the OS is online.
self.addEventListener("push", (event: any) => {
  let data: any = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    try { data = { title: "LeadDrive", body: event.data?.text?.() || "New activity" } } catch {}
  }
  const title = data.title || "LeadDrive"
  const options = {
    body: data.body || "",
    icon: data.icon || "/favicon.ico",
    tag: data.tag || "ld-push",
    data: { url: data.url || "/" },
    requireInteraction: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows: any[]) => {
      for (const c of windows) {
        try {
          const u = new URL(c.url)
          if (u.pathname === targetUrl || u.pathname.startsWith(targetUrl)) {
            return c.focus()
          }
        } catch {}
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
