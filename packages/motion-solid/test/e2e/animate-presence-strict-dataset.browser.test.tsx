/**
 * Port of upstream's `cypress/integration/animate-presence-strict-dataset.ts` and its page,
 * `dev/react/src/tests/animate-presence-strict-dataset.tsx`.
 *
 * Reproduction for #3746 — a key present in both datasets must not be treated
 * as freshly entering when the dataset is switched.
 *
 * The reported symptom is that on the *second* switch the persisting bar
 * "disappears and reappears, and its width animates from 0". We sample its
 * width every frame for the whole switch, so a collapse can't be missed
 * between assertions.
 *
 * Port note: upstream renders inside React.StrictMode, which has no Solid equivalent. The page
 * state lives in a module object instead of `window.presenceDataset`.
 */
import { createSignal, onSettled } from "solid-js"
import { AnimatePresence, For, motion } from "../../src"
import { query, trigger, visit, wait } from "./utils"

interface Datum {
    id: string
    value: number
    color: string
}

const datasetA: Datum[] = [
    { id: "a", value: 120, color: "blue" },
    { id: "persist", value: 200, color: "red" },
    { id: "b", value: 160, color: "green" },
]

const datasetB: Datum[] = [
    { id: "c", value: 140, color: "purple" },
    { id: "d", value: 180, color: "orange" },
    { id: "persist", value: 240, color: "red" },
]

/**
 * Sample the persisting bar every frame so the spec can assert it never
 * collapsed towards 0, rather than catching it at a single lucky moment.
 */
const widths: number[] = []

const presenceDataset = {
    mounts: {} as Record<string, number>,
    resetWidths: () => {
        widths.length = 0
    },
    minWidth: () => (widths.length ? Math.min(...widths) : -1),
}

function Bar(props: Datum) {
    onSettled(() => {
        const id = props.id
        presenceDataset.mounts[id] = (presenceDataset.mounts[id] || 0) + 1
    })

    return (
        <motion.div
            layout
            id={`bar-${props.id}`}
            initial={{ width: 0 }}
            animate={{ width: props.value }}
            exit={{ width: 0 }}
            transition={{ duration: 0.4, ease: "linear" }}
            style={{
                height: 40,
                marginBottom: 8,
                background: props.color,
            }}
        />
    )
}

function App() {
    const [data, setData] = createSignal(datasetA)
    let raf = 0

    onSettled(() => {
        const sample = () => {
            const el = document.getElementById("bar-persist")
            if (el) widths.push(el.getBoundingClientRect().width)
            raf = requestAnimationFrame(sample)
        }
        raf = requestAnimationFrame(sample)
        return () => cancelAnimationFrame(raf)
    })

    return (
        <div>
            <button
                id="switch"
                onClick={() =>
                    setData((d) => (d === datasetA ? datasetB : datasetA))
                }
            >
                Switch dataset
            </button>
            <div style={{ position: "relative" }}>
                <AnimatePresence>
                    <For each={data()} keyed={(datum) => datum.id}>
                        {(datum) => (
                            <Bar
                                id={datum().id}
                                value={datum().value}
                                color={datum().color}
                            />
                        )}
                    </For>
                </AnimatePresence>
            </div>
        </div>
    )
}

describe("AnimatePresence dataset switch", () => {
    it("Never replays the enter animation for a persisting key", async () => {
        presenceDataset.mounts = {}
        await visit(App)
        await wait(700)
        // First switch A -> B, let it settle completely.
        trigger(query("#switch"), "click", { x: 5, y: 5, force: true })
        await wait(700)
        // Start sampling fresh, then perform the second switch.
        presenceDataset.resetWidths()
        trigger(query("#switch"), "click", { x: 5, y: 5, force: true })
        await wait(700)
        // The bar goes from 240 -> 200. It must never dip towards 0.
        expect(presenceDataset.minWidth()).toBeGreaterThan(150)
        // And it must never have re-mounted.
        // Port note: upstream expects 2 because StrictMode double-invokes effects on mount. There's
        // no StrictMode in Solid, so a bar that mounts once reports 1.
        expect(presenceDataset.mounts.persist).toBe(1)
    })
})
