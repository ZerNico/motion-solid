/**
 * Helpers for the ports of upstream's Cypress specs (`packages/framer-motion/cypress/integration`
 * and the `dev/react/src/tests` pages they visit), which run in Vitest's browser mode like our
 * other browser tests.
 *
 * Translation guide:
 * - `cy.visit("?test=name&a=1")` → `await visit(App, { a: "1" })`: the page component gets the
 *   URL parameters as props (upstream pages read `URLSearchParams`).
 * - `.wait(ms)` → `await wait(ms)`.
 * - `.get("#id")` → `query("#id")` (or `document.querySelector`).
 * - `.should(callback)` (retried until it passes) → `await should(() => …)`; assertions in
 *   `.then(callback)` run once.
 * - `.trigger("pointerdown", x, y, options)` → `trigger(element, "pointerdown", { x, y, ...options })`
 *   (coordinates relative to the element, its center by default, like Cypress).
 * - `expect(a).to.equal(b)` (chai) → `expect(a).toBe(b)` etc.
 */
import { render } from "@solidjs/testing-library"
import type { JSX } from "@solidjs/web"
import { flush, type Component } from "solid-js"
import { page } from "vitest/browser"

/**
 * Cypress' default viewport, which upstream's specs measure against.
 */
export const VIEWPORT = { width: 1000, height: 660 }

/**
 * The relevant part of upstream's `dev/react/src/index.css`.
 */
const baseStyles = `
:root {
    font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
    font-weight: 400;
    color: #213547;
    background-color: #ffffff;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
}
body {
    margin: 0;
    /* Vitest's tester page sets \`min-height: 100vh\` (upstream's dev app doesn't). */
    min-height: 0;
}
h1 {
    font-size: 3.2em;
}
button {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    background-color: #f9f9f9;
    cursor: pointer;
}
`

let stylesInjected = false

function injectBaseStyles() {
    if (stylesInjected) return
    stylesInjected = true
    const style = document.createElement("style")
    style.dataset.e2eBase = ""
    style.textContent = baseStyles
    document.head.appendChild(style)
}

export const wait = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms))

export const nextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Renders a test page, like `cy.visit("?test=…")`. The page is removed after the test.
 */
export async function visit<P extends Record<string, any>>(
    App: Component<P>,
    props: P = {} as P
) {
    /**
     * Resize before rendering, and let the `resize` event settle: Motion blocks layout
     * animations for 250ms after a window resize, which would otherwise hit the first test of a
     * file (a test that resized the viewport leaves it resized for the next one too).
     */
    if (
        window.innerWidth !== VIEWPORT.width ||
        window.innerHeight !== VIEWPORT.height
    ) {
        await page.viewport(VIEWPORT.width, VIEWPORT.height)
        await nextFrame()
        await nextFrame()
    }
    injectBaseStyles()
    window.scrollTo(0, 0)
    const result = render(() => (<App {...props} />) as JSX.Element)
    flush()
    await nextFrame()
    return result
}

export function query<T extends Element = HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector)
    if (!element) throw new Error(`No element matches "${selector}"`)
    return element
}

/**
 * Retries `assertion` until it passes, like Cypress' `.should()` (4s by default).
 */
export function should(
    assertion: () => void,
    { timeout = 4000 }: { timeout?: number } = {}
) {
    return vi.waitFor(assertion, { timeout, interval: 16 })
}

export interface TriggerOptions extends Partial<PointerEventInit> {
    /**
     * Position relative to the element's top-left corner (its center by default).
     */
    x?: number
    y?: number
    /**
     * Cypress' `position` argument.
     */
    position?:
        | "center"
        | "topLeft"
        | "top"
        | "topRight"
        | "left"
        | "right"
        | "bottomLeft"
        | "bottom"
        | "bottomRight"
    /**
     * Cypress' `force`: skip scrolling the element into view (events are always dispatched).
     */
    force?: boolean
}

function positionOf(
    rect: DOMRect,
    position: NonNullable<TriggerOptions["position"]>
): [number, number] {
    const xs = { left: 0, center: rect.width / 2, right: rect.width }
    const ys = { top: 0, center: rect.height / 2, bottom: rect.height }
    switch (position) {
        case "topLeft":
            return [xs.left, ys.top]
        case "top":
            return [xs.center, ys.top]
        case "topRight":
            return [xs.right, ys.top]
        case "left":
            return [xs.left, ys.center]
        case "right":
            return [xs.right, ys.center]
        case "bottomLeft":
            return [xs.left, ys.bottom]
        case "bottom":
            return [xs.center, ys.bottom]
        case "bottomRight":
            return [xs.right, ys.bottom]
        default:
            return [xs.center, ys.center]
    }
}

/**
 * Dispatches a synthetic event like Cypress' `.trigger()`. Pointer events are primary mouse
 * events with `button: 0` (`buttons: 1` until `pointerup`), unless overridden.
 */
export function trigger(
    target: Element | Window | Document,
    type: string,
    options: TriggerOptions = {}
) {
    const { x, y, position = "center", force, ...init } = options

    /**
     * Like Cypress (actionability), scroll the element to the top of the viewport first, unless
     * `force: true`. Upstream's expectations in scrollable pages depend on it.
     */
    if (target instanceof Element && !force) {
        target.scrollIntoView({ block: "start", inline: "nearest" })
    }

    let clientX = init.clientX
    let clientY = init.clientY
    if (target instanceof Element && clientX === undefined) {
        const rect = target.getBoundingClientRect()
        const [offsetX, offsetY] =
            x !== undefined && y !== undefined
                ? [x, y]
                : positionOf(rect, position)
        clientX = rect.left + offsetX
        clientY = rect.top + offsetY
    }

    const eventInit: PointerEventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX,
        clientY,
        screenX: clientX,
        screenY: clientY,
        button: 0,
        buttons: type === "pointerup" || type === "mouseup" ? 0 : 1,
        ...init,
    }

    let event: Event
    if (type.startsWith("pointer")) {
        event = new PointerEvent(type, {
            isPrimary: true,
            pointerId: 1,
            pointerType: "mouse",
            ...eventInit,
        })
    } else if (
        type.startsWith("mouse") ||
        type === "click" ||
        type === "dblclick"
    ) {
        event = new MouseEvent(type, eventInit)
    } else if (type.startsWith("key")) {
        event = new KeyboardEvent(type, eventInit as KeyboardEventInit)
    } else {
        event = new Event(type, eventInit)
    }

    // pageX/pageY are read-only and derived from clientX/clientY + scroll in browsers.
    target.dispatchEvent(event)
    flush()
    return event
}

export interface BoundingBox {
    top: number
    left: number
    width: number
    height: number
}

/**
 * Upstream's `expectBbox` helper (rounded).
 */
export function expectBbox(element: Element, expected: Partial<BoundingBox>) {
    const bbox = element.getBoundingClientRect()
    if (expected.left !== undefined)
        expect(Math.round(bbox.left)).toBe(expected.left)
    if (expected.top !== undefined)
        expect(Math.round(bbox.top)).toBe(expected.top)
    if (expected.width !== undefined)
        expect(Math.round(bbox.width)).toBe(expected.width)
    if (expected.height !== undefined)
        expect(Math.round(bbox.height)).toBe(expected.height)
}
