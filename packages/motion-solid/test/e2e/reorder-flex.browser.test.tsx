/**
 * Port of upstream's `cypress/integration/reorder-flex.ts` and its page,
 * `dev/react/src/tests/reorder-flex.tsx`.
 */
import { createSignal, For } from "solid-js"
import { Reorder } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

type FlexLayout = "row" | "column" | "wrap" | "wrap-rtl"

const initialItems = ["a", "b", "c", "d"]

function App(props: { layout: FlexLayout }) {
    const [items, setItems] = createSignal(initialItems)
    const layout = props.layout

    return (
        <>
            <div data-testid="current-order">{items().join(",")}</div>
            <Reorder.Group
                as="div"
                values={items()}
                onReorder={setItems}
                style={{
                    display: "flex",
                    direction: layout === "wrap-rtl" ? "rtl" : "ltr",
                    flexDirection: layout === "column" ? "column" : "row",
                    flexWrap: layout.startsWith("wrap") ? "wrap" : "nowrap",
                    // Port note: React appends `px` to a numeric `gap`.
                    gap: "20px",
                    width: layout.startsWith("wrap") ? 180 : "auto",
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
                                flex: "0 0 80px",
                                height: 80,
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

const drag = async (x: number, y: number) => {
    const a = query("[data-testid='a']")
    await nextFrame()
    await nextFrame()
    trigger(a, "pointerdown", { x: 40, y: 40, force: true })
    await wait(50)
    trigger(a, "pointermove", { x: 50, y: 50, force: true })
    await nextFrame()
    await wait(50)
    trigger(a, "pointermove", { x, y, force: true })
    await nextFrame()
    await wait(100)
}

const expectOrder = (order: string) =>
    should(() =>
        expect(query("[data-testid='current-order']").textContent).toBe(order)
    )

describe("Reorder flex layouts", () => {
    /**
     * Port note: upstream's drags are never released, and each `cy.visit` reloads the page.
     * Release the pointer so a drag (and the global drag lock) doesn't carry over to the next test.
     */
    afterEach(() => {
        trigger(window, "pointerup", { clientX: 0, clientY: 0 })
    })

    it("auto-detects a flex row", async () => {
        await visit(App, { layout: "row" })
        await wait(200)
        await drag(150, 40)
        await expectOrder("b,a,c,d")
    })

    it("auto-detects a flex column", async () => {
        await visit(App, { layout: "column" })
        await wait(200)
        await drag(40, 150)
        await expectOrder("b,a,c,d")
    })

    it("auto-detects wrapped flex rows", async () => {
        await visit(App, { layout: "wrap" })
        await wait(200)
        await drag(150, 150)
        await expectOrder("b,c,d,a")
    })

    it("auto-detects wrapped RTL flex rows", async () => {
        await visit(App, { layout: "wrap-rtl" })
        await wait(200)
        await drag(-70, 150)
        await expectOrder("b,c,d,a")
    })
})
