import { isServer } from "@solidjs/web"

/**
 * Port note: also `false` in Solid's server build (`isServer`), even where the server has a
 * `window` (a DOM shim, jsdom).
 */
export const isBrowser = !isServer && typeof window !== "undefined"
