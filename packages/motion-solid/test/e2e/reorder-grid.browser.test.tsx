/**
 * Port of upstream's `cypress/integration/reorder-grid.ts` and its page,
 * `dev/react/src/tests/reorder-grid.tsx`.
 */
import { createSignal, For } from "solid-js"
import { Reorder } from "../../src"
import { nextFrame, query, trigger, visit, wait } from "./utils"

const initialItems = ["a", "b", "c", "d"]

function App() {
    const [items, setItems] = createSignal(initialItems)

    return (
        <>
            <div data-testid="current-order">{items().join(",")}</div>
            <Reorder.Group
                as="div"
                values={items()}
                onReorder={setItems}
                style={{
                    display: "grid",
                    gridTemplateColumns: "100px 100px",
                    // Port note: React appends `px` to a numeric `gap`.
                    gap: "10px",
                    width: 210,
                }}
            >
                <For each={items()}>
                    {(item) => (
                        <Reorder.Item
                            as="div"
                            value={item}
                            data-testid={item}
                            transition={{ duration: 0 }}
                            style={{
                                alignItems: "center",
                                background: "#eee",
                                display: "flex",
                                height: 100,
                                justifyContent: "center",
                            }}
                        >
                            {item}
                        </Reorder.Item>
                    )}
                </For>
            </Reorder.Group>
        </>
    )
}

describe("Reorder grid", () => {
    it("auto-detects a grid and reorders across both axes", async () => {
        await visit(App)
        await wait(200)

        const a = query("[data-testid='a']")
        await nextFrame()
        await nextFrame()
        trigger(a, "pointerdown", { x: 50, y: 50, force: true })
        await wait(50)
        trigger(a, "pointermove", { x: 60, y: 60, force: true })
        await nextFrame()
        await wait(50)
        trigger(a, "pointermove", { x: 160, y: 160, force: true })
        await nextFrame()
        await wait(100)

        expect(query("[data-testid='current-order']").textContent).toBe(
            "b,c,d,a"
        )

        trigger(a, "pointerup", { x: 160, y: 160, force: true })
    })
})
