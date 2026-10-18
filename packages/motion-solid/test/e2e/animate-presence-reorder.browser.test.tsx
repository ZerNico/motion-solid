/**
 * Port of upstream's `cypress/integration/animate-presence-reorder.ts` and its page,
 * `dev/react/src/tests/animate-presence-reorder.tsx`.
 */
import { createSignal, For as SolidFor } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const color = ["red", "green"]

const shortPoems = ["1", "2"]

function App() {
    const [items, setItems] = createSignal(
        Array.from({ length: 2 }, (_, i) => ({
            color: color[i],
            poem: shortPoems[i],
            key: i,
        }))
    )

    return (
        <>
            <button
                id="move"
                style={{
                    "margin-bottom": "2rem",
                }}
                onClick={() => {
                    setItems((items) => {
                        items = [...items]
                        items.push(items.shift()!)
                        return items
                    })
                }}
            >
                Move
            </button>

            <SolidFor each={items()}>
                {(item, i) => (
                    <ListItem
                        color={item.color}
                        poem={item.poem}
                        isOpen={i() === 0}
                    />
                )}
            </SolidFor>
        </>
    )
}

function ListItem(props: { color: string; poem: string; isOpen: boolean }) {
    const transition = { duration: 0.2 }

    return (
        <div class="item" style={{ "background-color": props.color }}>
            <AnimatePresence mode="wait" initial={false}>
                <Show
                    when={props.isOpen}
                    fallback={<div style={{ height: "3rem" }} />}
                >
                    <motion.div
                        initial="hide"
                        animate="show"
                        exit="hide"
                        variants={{
                            show: {
                                opacity: 1,
                                transition,
                            },
                            hide: {
                                opacity: 0,
                                transition,
                            },
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                        }}
                    >
                        {props.poem}
                    </motion.div>
                </Show>
            </AnimatePresence>
        </div>
    )
}

describe("AnimatePresence reorder", () => {
    it("Correct number of animations trigger", async () => {
        await visit(App)
        await wait(50)
        trigger(query("#move"), "click", { x: 10, y: 10, force: true })
        await wait(300)
        await should(() => {
            const items = document.querySelectorAll(".item")
            expect(items[0].textContent).toBe("2")
            expect(items[1].textContent).toBe("")
        })
    })
})
