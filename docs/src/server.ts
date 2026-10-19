import { provideRequestEvent } from "@solidjs/web/storage"
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/solid-start-server"

/**
 * Start rc.8's default server entry imports server-function helpers that Solid Web removed in
 * rc.13. The docs have no server functions, so this uses Start's handler directly, in the same
 * request-event scope. Remove it once Start's entry works with Solid Web again.
 */
const handle = createStartHandler(defaultStreamHandler)

export default {
  fetch: (request: Request) =>
    provideRequestEvent({ request, locals: {} }, () => handle(request)),
}
