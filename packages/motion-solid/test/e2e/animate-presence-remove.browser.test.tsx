/**
 * Port of upstream's `cypress/integration/animate-presence-remove.ts` and its page,
 * `dev/react/src/tests/animate-presence-remove.tsx`.
 */
import { createSignal } from "solid-js"
import { AnimatePresence, For, motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const boxStyles = {
    width: "100px",
    height: "100px",
    backgroundColor: "red",
}

const Box = (props: { id: number }) => {
    return (
        <motion.div
            id={`box-${props.id}`}
            class="box"
            style={boxStyles}
            transition={{ duration: 0.5 }}
            exit={{ opacity: 0.5 }}
        />
    )
}

function App() {
    const [range, setRange] = createSignal([0, 1, 2])

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                "flex-direction": "column",
                padding: "100px",
            }}
        >
            <button id="remove" onClick={() => setRange(range().slice(0, -1))}>
                Remove
            </button>
            <AnimatePresence>
                <For each={range()}>{(i) => <Box id={i} />}</For>
            </AnimatePresence>
        </div>
    )
}

describe("AnimatePresence", () => {
    it("Ensures all elements are removed", async () => {
        await visit(App)
        await wait(50)
        trigger(query("#remove"), "click", { x: 1, y: 1, force: true })
        await wait(100)
        trigger(query("#remove"), "click", { x: 1, y: 1, force: true })
        await wait(700)
        await should(() => {
            expect(document.querySelectorAll(".box").length).toBe(1)
        })
    })
})
