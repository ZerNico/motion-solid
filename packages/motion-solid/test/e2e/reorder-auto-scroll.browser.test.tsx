/**
 * Port of upstream's `cypress/integration/reorder-auto-scroll.ts` and the pages it visits,
 * `dev/react/src/tests/reorder-auto-scroll.tsx`, `reorder-auto-scroll-container.tsx` and
 * `reorder-auto-scroll-page.tsx`.
 *
 * Tests for Reorder auto-scroll feature. Verifies that when dragging a reorder item near the edge
 * of a scrollable container, the container automatically scrolls.
 */
import { createSignal, For } from "solid-js"
import { Reorder, useMotionValue } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

const initialItems = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

function Item(props: { item: number }) {
    const y = useMotionValue(0)
    const hue = props.item * 30

    return (
        <Reorder.Item
            value={props.item}
            id={String(props.item)}
            style={{
                y,
                backgroundColor: `hsl(${hue}, 70%, 50%)`,
            }}
            data-testid={String(props.item)}
        />
    )
}

function List() {
    const [items, setItems] = createSignal(initialItems)
    return (
        <Reorder.Group axis="y" onReorder={setItems} values={items()}>
            <For each={items()}>{(item) => <Item item={item} />}</For>
        </Reorder.Group>
    )
}

const itemStyles = `
ul,
li {
    list-style: none;
    padding: 0;
    margin: 0;
}

li {
    border-radius: 10px;
    margin-bottom: 10px;
    width: 100%;
    height: 60px;
    position: relative;
    border-radius: 5px;
    flex-shrink: 0;
    cursor: grab;
}
`

/**
 * `reorder-auto-scroll.tsx`
 */
function App() {
    return (
        <div
            data-testid="scroll-container"
            style={{
                height: "300px",
                overflow: "auto",
            }}
        >
            <List />
            <style>{`
body {
    width: 100vw;
    height: 100vh;
    background: #333;
    overflow: hidden;
    padding: 0;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
}

ul {
    position: relative;
    width: 300px;
}
${itemStyles}`}</style>
        </div>
    )
}

const scrollablePageStyles = `
html, body {
    width: 100%;
    min-height: 100%;
    background: #333;
    padding: 0;
    margin: 0;
}

ul {
    position: relative;
    width: 100%;
}
${itemStyles}`

/**
 * `reorder-auto-scroll-container.tsx`: the scrollable container is inside a scrollable page.
 */
function ContainerApp() {
    return (
        <>
            {/* Spacer to make page scrollable */}
            <div style={{ height: "300px", background: "#222" }}>
                <p style={{ color: "#fff", padding: "20px" }}>
                    Scroll down to see the reorder list. The container and the
                    page are both scrollable.
                </p>
            </div>
            <div
                data-testid="scroll-container"
                style={{
                    height: "300px",
                    overflow: "auto",
                    margin: "0 auto",
                    width: "300px",
                    background: "#444",
                }}
            >
                <List />
            </div>
            {/* More spacer to ensure page is scrollable */}
            <div style={{ height: "500px", background: "#222" }}>
                <p style={{ color: "#fff", padding: "20px" }}>Bottom spacer</p>
            </div>
            <style>{scrollablePageStyles}</style>
        </>
    )
}

/**
 * `reorder-auto-scroll-page.tsx`: no scrollable container, inside a scrollable page.
 */
function PageApp() {
    return (
        <>
            {/* Spacer to make page scrollable */}
            <div style={{ height: "300px", background: "#222" }}>
                <p style={{ color: "#fff", padding: "20px" }}>
                    Scroll down to see the reorder list. The page is scrollable.
                </p>
            </div>
            <div
                data-testid="scroll-container"
                style={{
                    margin: "0 auto",
                    width: "300px",
                    background: "#444",
                }}
            >
                <List />
            </div>
            {/* More spacer to ensure page is scrollable */}
            <div style={{ height: "500px", background: "#222" }}>
                <p style={{ color: "#fff", padding: "20px" }}>Bottom spacer</p>
            </div>
            <style>{scrollablePageStyles}</style>
        </>
    )
}

const container = () => query("[data-testid='scroll-container']")

async function dragNear(testId: string, startY: number, nearY: number) {
    const item = query(`[data-testid='${testId}']`)
    await nextFrame()
    await nextFrame()
    trigger(item, "pointerdown", { x: 50, y: 25 })
    await wait(50)
    trigger(item, "pointermove", { x: 50, y: startY, force: true })
    await nextFrame()
    await wait(50)
    trigger(item, "pointermove", { x: 50, y: nearY, force: true })
    await nextFrame()
    await wait(300)
}

/**
 * Port note: Cypress' `.trigger()` sets `pageX`/`pageY` to the client coordinates plus the page
 * scroll. Synthetic events in browsers don't (`pageY === clientY` in Chromium), and `trigger`
 * from `./utils` can't set them (read-only), so they're defined on the events here, before any
 * listener runs.
 */
const pointerTypes = ["pointerdown", "pointermove", "pointerup"]

function definePagePoint(event: Event) {
    const { clientX, clientY } = event as PointerEvent
    Object.defineProperty(event, "pageX", { value: clientX + window.scrollX })
    Object.defineProperty(event, "pageY", { value: clientY + window.scrollY })
}

describe("Reorder auto-scroll", () => {
    beforeEach(() => {
        pointerTypes.forEach((type) =>
            window.addEventListener(type, definePagePoint, { capture: true })
        )
    })

    afterEach(() => {
        pointerTypes.forEach((type) =>
            window.removeEventListener(type, definePagePoint, {
                capture: true,
            })
        )
    })

    describe("with scrollable container", () => {
        it("Auto-scrolls down when dragging near bottom edge", async () => {
            await visit(App)
            await wait(200)
            expect(container().scrollTop).toBe(0)

            const containerRect = container().getBoundingClientRect()
            const nearBottom = containerRect.bottom - containerRect.top - 20

            await dragNear("0", 30, nearBottom)
            expect(container().scrollTop).toBeGreaterThan(0)
            trigger(query("[data-testid='0']"), "pointerup", { force: true })
        })

        it("Auto-scrolls up when dragging near top edge", async () => {
            await visit(App)
            await wait(200)
            container().scrollTop = 200
            await wait(100)
            await should(() => expect(container().scrollTop).toBe(200))

            await dragNear("8", 20, -100)
            expect(container().scrollTop).toBeLessThan(200)
            trigger(query("[data-testid='8']"), "pointerup", { force: true })
        })
    })

    describe("with scrollable container inside scrollable page", () => {
        it("Auto-scrolls container after page has been scrolled", async () => {
            await visit(ContainerApp)
            await wait(200)
            // Scroll the page down so the container is in view
            window.scrollTo(0, 200)
            await wait(100)
            expect(container().scrollTop).toBe(0)

            const containerRect = container().getBoundingClientRect()
            const nearBottom = containerRect.bottom - containerRect.top - 20

            await dragNear("0", 30, nearBottom)
            expect(container().scrollTop).toBeGreaterThan(0)
            trigger(query("[data-testid='0']"), "pointerup", { force: true })
        })
    })

    describe("without scrollable container inside scrollable page", () => {
        it("Auto-scrolls page after dragging near the edges", async () => {
            await visit(PageApp)
            await wait(200)
            // Check window position, then scroll
            expect(window.scrollY).toBe(0)
            await wait(100)

            const nearBottom = window.innerHeight - window.screenTop - 20

            await dragNear("0", 30, nearBottom)
            expect(window.scrollY).toBeGreaterThan(0)
            trigger(query("[data-testid='0']"), "pointerup", { force: true })
        })
    })
})
