/**
 * Port of upstream's `cypress/integration/reorder-axis-change.ts` and its page,
 * `dev/react/src/tests/reorder-axis-change.tsx`.
 *
 * Tests for #3022: Reorder.Group stops working if axis changes after window resize (via
 * matchMedia).
 */
import { render } from "@solidjs/testing-library"
import type { JSX } from "@solidjs/web"
import { createSignal, flush, For, onSettled, type Component } from "solid-js"
import { page } from "vitest/browser"
import { Reorder } from "../../src"
import { nextFrame, query, should, trigger, wait } from "./utils"

const initialItems = ["Tomato", "Cucumber", "Cheese", "Lettuce"]

function App() {
    const [axis, setAxis] = createSignal<"x" | "y">("y")
    const [items, setItems] = createSignal(initialItems)

    onSettled(() => {
        const media = window.matchMedia("(min-width: 500px)")
        const change = (event: MediaQueryListEvent) => {
            setAxis(event.matches ? "x" : "y")
        }
        // Set initial axis based on current width
        setAxis(media.matches ? "x" : "y")
        media.addEventListener("change", change)
        return () => media.removeEventListener("change", change)
    })

    return (
        <div>
            <div id="current-order" data-testid="current-order">
                {items().join(",")}
            </div>
            <div id="current-axis" data-testid="current-axis">
                {axis()}
            </div>
            <Reorder.Group
                as="div"
                axis={axis()}
                values={items()}
                onReorder={setItems}
                style={{
                    display: "grid",
                    gridAutoFlow: axis() === "x" ? "column" : "row",
                    // Port note: string values where React appends `px` to a number.
                    gap: "10px",
                    padding: "10px",
                    listStyle: "none",
                }}
            >
                <For each={items()}>
                    {(item) => (
                        <Reorder.Item
                            as="div"
                            value={item}
                            data-testid={item}
                            style={{
                                padding: "20px",
                                background: "#eee",
                                cursor: "grab",
                                minWidth: "80px",
                                minHeight: "50px",
                            }}
                        >
                            {item}
                        </Reorder.Item>
                    )}
                </For>
            </Reorder.Group>
            <style>{`
                body {
                    margin: 0;
                    padding: 20px;
                }
            `}</style>
        </div>
    )
}

/**
 * `cy.viewport(width, height)` then `cy.visit(…)`: `visit` from `./utils` renders at Cypress'
 * default viewport, so this renders at the given one.
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

async function dragTomato() {
    const tomato = query("[data-testid='Tomato']")
    await nextFrame()
    await nextFrame()
    trigger(tomato, "pointerdown", { x: 40, y: 25, force: true })
    await wait(50)
    for (const y of [30, 50, 80, 110]) {
        trigger(tomato, "pointermove", { x: 40, y, force: true })
        await nextFrame()
        await wait(y === 110 ? 100 : 50)
    }
}

describe("Reorder axis change on resize", () => {
    it("Baseline: reorder works without axis change", async () => {
        await visitAt(App, 400, 600)
        await wait(200)

        await should(() =>
            expect(query("[data-testid='current-axis']").textContent).toBe("y")
        )

        // Drag Tomato down past Cucumber using element-relative coords
        await dragTomato()

        expect(query("[data-testid='current-order']").textContent).not.toBe(
            "Tomato,Cucumber,Cheese,Lettuce"
        )

        trigger(query("[data-testid='Tomato']"), "pointerup", {
            x: 40,
            y: 110,
            force: true,
        })
    })

    it("Reorders correctly after axis changes via resize", async () => {
        // Start wide so axis='x'
        await visitAt(App, 600, 600)
        await wait(200)

        await should(() =>
            expect(query("[data-testid='current-axis']").textContent).toBe("x")
        )

        // Resize to trigger matchMedia → axis='y'
        await page.viewport(400, 600)
        await wait(500)
        await should(() =>
            expect(query("[data-testid='current-axis']").textContent).toBe("y")
        )

        // Drag Tomato down past Cucumber
        await dragTomato()

        expect(query("[data-testid='current-order']").textContent).not.toBe(
            "Tomato,Cucumber,Cheese,Lettuce"
        )

        trigger(query("[data-testid='Tomato']"), "pointerup", {
            x: 40,
            y: 110,
            force: true,
        })
    })
})
