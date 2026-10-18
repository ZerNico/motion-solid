/**
 * Port of upstream's `cypress/integration/reorder-ref-constraints-resize.ts` and its page,
 * `dev/react/src/tests/reorder-ref-constraints-resize.tsx`.
 *
 * Issue #3823: Reorder.Items that have never been dragged shouldn't be offset when the window
 * (and so the ref constraints) resizes.
 */
import { render } from "@solidjs/testing-library"
import type { JSX } from "@solidjs/web"
import { createSignal, flush, For, type Component } from "solid-js"
import { page } from "vitest/browser"
import { Reorder } from "../../src"
import { nextFrame, query, should, trigger, wait } from "./utils"

function App() {
    const [container, setContainer] = createSignal<HTMLElement | null>(null)
    const [items, setItems] = createSignal([
        "one",
        "two",
        "three",
        "four",
        "five",
    ])
    const [selected, setSelected] = createSignal("one")

    return (
        <>
            <Reorder.Group
                ref={(element: Element) => setContainer(element as HTMLElement)}
                axis="x"
                values={items()}
                onReorder={setItems}
                style={{
                    display: "flex",
                    listStyle: "none",
                    padding: 8,
                    margin: 0,
                }}
            >
                <For each={items()}>
                    {(item) => (
                        <Reorder.Item
                            value={item}
                            id={item}
                            dragConstraints={container}
                            style={{
                                width: 80,
                                height: 40,
                                marginRight: 8,
                                flexShrink: 0,
                                background:
                                    selected() === item ? "#bcd" : "#eee",
                            }}
                        >
                            <button
                                type="button"
                                style={{ width: "100%", height: "100%" }}
                                onClick={() => setSelected(item)}
                            >
                                {item}
                            </button>
                        </Reorder.Item>
                    )}
                </For>
            </Reorder.Group>
            <div id="selected">{selected()}</div>
            {/* Port note: upstream's dev app has no body margin (utils' base styles). */}
            <style>{"body { margin: 0; }"}</style>
        </>
    )
}

/**
 * `cy.viewport(width, height).visit(…)`: `visit` from `./utils` renders at Cypress' default
 * viewport, so this renders at the given one.
 */
async function visitAt(App: Component, width: number, height: number) {
    if (window.innerWidth !== width || window.innerHeight !== height) {
        await page.viewport(width, height)
        await nextFrame()
        await nextFrame()
    }
    window.scrollTo(0, 0)
    const result = render(() => (<App />) as JSX.Element)
    flush()
    await nextFrame()
    return result
}

/**
 * Items are 80px wide with an 8px right margin inside a list with 8px padding, so item i is laid
 * out at left = 8 + i * 88.
 */
const items = ["one", "two", "three", "four", "five"]

async function expectItemsAtOrigin(width: number) {
    await page.viewport(width, 660)
    await wait(200)
    items.forEach((item, i) => {
        const element = query(`#${item}`)
        const label = `${item} at ${width}px`
        expect(element.getBoundingClientRect().left, label).toBe(8 + i * 88)
        expect(getComputedStyle(element).zIndex, label).toBe("auto")
    })
}

/**
 * Cypress' `.click(x, y)` on `body`: the pointer and mouse events of a click, on the topmost
 * element at those coordinates.
 */
function clickAt(x: number, y: number) {
    const target = document.elementFromPoint(x, y)!
    const init = { clientX: x, clientY: y, force: true }
    trigger(target, "pointerdown", init)
    trigger(target, "mousedown", init)
    trigger(target, "pointerup", init)
    trigger(target, "mouseup", init)
    trigger(target, "click", { ...init, buttons: 0 })
}

describe("Reorder.Item with ref dragConstraints", () => {
    it("Items at their origin stay there when the window resizes", async () => {
        await visitAt(App, 1200, 660)
        await wait(200)
        await expectItemsAtOrigin(1200)
        await expectItemsAtOrigin(500)
        await expectItemsAtOrigin(1000)
    })

    it("Clicking an item after a resize selects that item", async () => {
        await visitAt(App, 1200, 660)
        await wait(200)
        await page.viewport(500, 660)
        await wait(200)

        // Click the centre of where "four" is laid out
        clickAt(8 + 3 * 88 + 40, 28)
        await should(() => expect(query("#selected").textContent).toBe("four"))
    })
})
