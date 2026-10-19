import { renderToString } from "../../../test/renderToString"
import {
    InitialStyles,
    Layout,
    MotionValueState,
    MotionValues,
    Presence,
    ScrollContainerSignal,
    Tappable,
} from "./ssr.fixtures"

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const opacity = (element: Element) => Number(getComputedStyle(element).opacity)

describe("SSR", () => {
    beforeEach(() => {
        document.body.style.margin = "0"
    })

    test("renders initial values as styles, and animates once hydrated", async () => {
        const { container, html, hydrate } = await renderToString(InitialStyles)
        expect(html).toContain("opacity:0")
        expect(html).toContain("transform:translateX(100px)")
        expect(html).toContain("background-color:red")
        expect(html).not.toContain("initial")

        const box = container.querySelector("#box") as HTMLElement
        hydrate()
        expect(container.querySelector("#box")).toBe(box)
        await vi.waitFor(() => expect(opacity(box)).toBe(1))
        await vi.waitFor(() => expect(box.style.transform).toBe("none"))
    })

    test("renders motion values in style and as children", async () => {
        const { html, hydrate, container } = await renderToString(MotionValues)
        expect(html).toContain("transform:translateX(50px)")
        expect(html).toContain("opacity:0.5")
        expect(container.querySelector("#box")!.textContent).toBe("5")
        hydrate()
    })

    test("useMotionValueState renders the current value and updates once hydrated", async () => {
        const { html, hydrate, container } = await renderToString(
            MotionValueState
        )
        expect(html).toMatch(/id="value"[^>]*>1</)
        expect(html).toMatch(/id="plain"[^>]*>2</)
        hydrate()

        const text = (id: string) => container.querySelector(id)!.textContent
        ;(container.querySelector("#switch") as HTMLElement).click()
        await vi.waitFor(() => expect(text("#value")).toBe("2"))
        ;(container.querySelector("#set") as HTMLElement).click()
        await vi.waitFor(() => expect(text("#value")).toBe("5"))
        expect(text("#plain")).toBe("5")
    })

    test("useScroll with an accessor ref hydrates", async () => {
        const { container, hydrate } = await renderToString(
            ScrollContainerSignal
        )
        const bar = container.querySelector("#bar")
        hydrate()
        expect(container.querySelector("#bar")).toBe(bar)
    })

    test("sets tabindex for tap gestures", async () => {
        const { html, hydrate } = await renderToString(Tappable)
        expect(html).toContain('tabindex="0"')
        hydrate()
    })

    test("presence: hydrated children exit", async () => {
        const { container, hydrate } = await renderToString(Presence)
        hydrate()
        const box = container.querySelector("#box")!
        await vi.waitFor(() => expect(opacity(box)).toBe(1))
        ;(container.querySelector("#toggle") as HTMLElement).click()
        await vi.waitFor(() => expect(opacity(box)).toBeLessThan(1))
        expect(box.isConnected).toBe(true)
        await vi.waitFor(() => expect(box.isConnected).toBe(false))
    })

    test("layout: hydrated elements animate layout changes", async () => {
        const { container, hydrate } = await renderToString(Layout)
        hydrate()
        const box = container.querySelector("#box") as HTMLElement
        await nextFrame()

        box.click()
        await nextFrame()
        await nextFrame()
        const width = box.getBoundingClientRect().width
        expect(width).toBeGreaterThan(100)
        expect(width).toBeLessThan(190)
    })
})
