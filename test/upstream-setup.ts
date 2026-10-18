/**
 * Port of upstream's `jest.setup.tsx` stubs, and a `jest` global for the ported tests (Vitest's
 * `vi` has the same API for what upstream uses).
 */
import { vi } from "vitest"
;(globalThis as any).jest = vi

/**
 * Stub PointerEvent - this is so we can pass through PointerEvent.isPrimary
 */
const pointerEventProps = ["isPrimary", "pointerType", "button"]
class PointerEventFake extends Event {
    constructor(type: any, props: any) {
        super(type, props)
        if (!props) return
        pointerEventProps.forEach((prop) => {
            if (props[prop] !== null) {
                this[prop as keyof typeof this] = props[prop]
            }
        })
    }
}
;(globalThis as any).PointerEvent = PointerEventFake

// Stub ResizeObserver
if (!(globalThis as any).ResizeObserver) {
    ;(globalThis as any).ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as any
}

// Stub scrollTo
const noop = () => {}
Object.defineProperty(globalThis, "scrollTo", { value: noop, writable: true })

/**
 * jsdom 30 caches computed styles and only clears the cache when a connected node changes, so
 * `getComputedStyle` (and `toHaveStyle`) returns stale styles for a detached element whose inline
 * style changed after it was read. Upstream's jsdom (Jest 29) has no cache. Clear it with a
 * connected mutation before reading a detached element.
 */
const getComputedStyle = window.getComputedStyle
window.getComputedStyle = function (element, pseudoElement) {
    if (!element.isConnected) {
        const marker = document.createComment("")
        document.documentElement.appendChild(marker)
        marker.remove()
    }
    return getComputedStyle.call(this, element, pseudoElement)
}
