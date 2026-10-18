/**
 * Port of upstream's `cypress/integration/reorder-scaled-parent.ts` and its page,
 * `dev/react/src/tests/reorder-scaled-parent.tsx`.
 *
 * Reorder inside a parent with a raw CSS `transform: scale()` and a non-centre
 * `transform-origin` (#2449 / #2750). The supported workaround is `correctParentTransform(ref)`
 * via `MotionConfig transformPagePoint`.
 *
 * Port note: motion-solid doesn't export `correctParentTransform` (upstream's
 * `utils/transform-rotated-parent.ts`), so the page has a copy, taking an accessor of the parent
 * instead of a React ref.
 */
import type { JSX } from "@solidjs/web"
import { createSignal, For } from "solid-js"
import type { Point, TransformPoint } from "../../src"
import { MotionConfig, Reorder, useMotionValue } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

function correctParentTransform(
    parent: () => HTMLElement | null | undefined
): TransformPoint {
    return (point: Point): Point => {
        const element = parent()
        if (!element) return point

        const inv = getInverseMatrix(element)
        if (!inv) return point

        // Get center of rotation in page space
        const rect = element.getBoundingClientRect()
        const cx = rect.left + window.scrollX + rect.width / 2
        const cy = rect.top + window.scrollY + rect.height / 2

        // Transform (point - center) through inverse, then add center back
        const dx = point.x - cx
        const dy = point.y - cy
        return {
            x: cx + inv.a * dx + inv.c * dy,
            y: cy + inv.b * dx + inv.d * dy,
        }
    }
}

function getInverseMatrix(element: HTMLElement) {
    const { transform } = getComputedStyle(element)
    if (!transform || transform === "none") return null

    const match =
        transform.match(/^matrix3d\((.*)\)$/u) ||
        transform.match(/^matrix\((.*)\)$/u)
    if (!match) return null

    const v = match[1].split(",").map(Number)
    const is3d = transform.startsWith("matrix3d")
    const a = v[0],
        b = v[1]
    const c = is3d ? v[4] : v[2]
    const d = is3d ? v[5] : v[3]

    const det = a * d - b * c
    if (Math.abs(det) < 1e-10) return null

    return { a: d / det, b: -b / det, c: -c / det, d: a / det }
}

const initialItems = [0, 1, 2, 3]

function Item(props: { item: number }) {
    const y = useMotionValue(0)
    const hue = props.item * 90

    return (
        <Reorder.Item
            value={props.item}
            id={`item-${props.item}`}
            data-testid={`item-${props.item}`}
            dragMomentum={false}
            transition={{ duration: 0 }}
            style={{
                y,
                height: 50,
                marginBottom: 10,
                borderRadius: 8,
                listStyle: "none",
                cursor: "grab",
                background: `hsl(${hue}, 70%, 50%)`,
            }}
        />
    )
}

function App(props: { scale?: string; corrected?: string }) {
    const scale = parseFloat(props.scale || "0.5")
    const corrected = props.corrected === "true"

    const [ref, setRef] = createSignal<HTMLDivElement>()
    const [items, setItems] = createSignal(initialItems)

    const group = () => (
        <Reorder.Group
            axis="y"
            onReorder={setItems}
            values={items()}
            id="reorder-group"
            style={{ listStyle: "none", padding: 0, margin: 0, width: 280 }}
        >
            <For each={items()}>{(item) => <Item item={item} />}</For>
        </Reorder.Group>
    )

    return (
        <div
            ref={setRef}
            id="scaled-parent"
            style={{
                position: "absolute",
                top: "0px",
                left: "0px",
                width: "300px",
                height: "600px",
                padding: "10px",
                "box-sizing": "border-box",
                background: "#222",
                transform: `scale(${scale})`,
                "transform-origin": "top left",
            }}
        >
            <Wrapper corrected={corrected} parent={ref}>
                {group()}
            </Wrapper>
            <style>{styles}</style>
        </div>
    )
}

const Wrapper = (props: {
    corrected: boolean
    parent: () => HTMLDivElement | undefined
    children: JSX.Element
}) =>
    props.corrected ? (
        <MotionConfig transformPagePoint={correctParentTransform(props.parent)}>
            {props.children}
        </MotionConfig>
    ) : (
        <>{props.children}</>
    )

const styles = `
body {
  margin: 0;
  padding: 0;
  background: #ffaa00;
}
`

const itemOrder = () =>
    Array.from(
        document.querySelectorAll("#reorder-group [data-testid]"),
        (el) => el.getAttribute("data-testid") as string
    )

describe("Reorder inside a scaled parent (#2449 / #2750)", () => {
    it("dragged item tracks the cursor with correctParentTransform (scale 0.5)", async () => {
        await visit(App, { corrected: "true", scale: "0.5" })
        await should(() => query("[data-testid='item-0']"))

        const el = query("[data-testid='item-0']")
        const start = el.getBoundingClientRect()
        const startMidY = start.top + start.height / 2

        await nextFrame()
        await nextFrame()
        trigger(el, "pointerdown", { x: 20, y: 10, force: true })
        await wait(50)
        // Move past the drag threshold.
        trigger(el, "pointermove", { x: 20, y: 16, force: true })
        await nextFrame()
        await wait(50)
        // Move the pointer 80px down the screen.
        trigger(el, "pointermove", { x: 20, y: 90, force: true })
        await nextFrame()

        // Drag tracking is 1:1, not a tween: retry until the frame loop applies the pointermove.
        await should(() => {
            const moved = el.getBoundingClientRect()
            const screenDelta = moved.top + moved.height / 2 - startMidY

            // The element must follow the cursor (~80px on screen), not 80 / scale (160px) or
            // 80 * scale (40px) as it would without the transformPagePoint correction.
            expect(screenDelta).toBeGreaterThan(60)
            expect(screenDelta).toBeLessThan(100)
        })

        trigger(el, "pointerup", { force: true })
    })

    it("reorders correctly and settles aligned with correctParentTransform", async () => {
        await visit(App, { corrected: "true", scale: "0.5" })
        await should(() => query("[data-testid='item-0']"))

        await should(() =>
            expect(itemOrder()).toEqual([
                "item-0",
                "item-1",
                "item-2",
                "item-3",
            ])
        )

        // Element-relative moves. Scale 0.5 → ~40px screen is ~80px local, enough to cross
        // item-1's centre (needs >35px local) without racing through the whole list.
        const el = query("[data-testid='item-0']")
        await nextFrame()
        await nextFrame()
        trigger(el, "pointerdown", { x: 20, y: 10, force: true })
        await wait(50)
        for (const y of [16, 35, 50]) {
            trigger(el, "pointermove", { x: 20, y, force: true })
            await nextFrame()
            await wait(50)
        }
        trigger(el, "pointerup", { force: true })

        await should(() => {
            const order = itemOrder()
            expect(
                order.indexOf("item-0"),
                `expected item-0 to sit below item-1, got ${order.join(",")}`
            ).toBeGreaterThan(order.indexOf("item-1"))
        })

        // List sits flush: 10px local gap × 0.5 scale = 5px screen, no leftover drag/layout
        // transform. Retry until springs finish.
        await should(() => {
            const boxes = Array.from(
                document.querySelectorAll("#reorder-group [data-testid]"),
                (el) => el.getBoundingClientRect()
            )
            for (let i = 1; i < boxes.length; i++) {
                expect(
                    Math.abs(boxes[i].top - (boxes[i - 1].bottom + 5))
                ).toBeLessThanOrEqual(4)
            }
        })
    })
})
