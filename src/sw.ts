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
