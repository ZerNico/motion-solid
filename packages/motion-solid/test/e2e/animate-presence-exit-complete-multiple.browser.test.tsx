/**
 * Port of upstream's `cypress/integration/animate-presence-exit-complete-multiple.ts` and its page,
 * `dev/react/src/tests/animate-presence-exit-complete-multiple.tsx`.
 *
 * Regression test for issue #3233:
 * AnimatePresence onExitComplete should fire exactly once per exit,
 * even with shared layoutId cycling through multiple AnimatePresence instances.
 */
import type { JSX } from "@solidjs/web"
import { createSignal, onSettled } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const maxNum = 4

const boxStyle: JSX.CSSProperties = {
    width: "100px",
    height: "100px",
    background: "aqua",
    "margin-bottom": "20px",
    position: "relative",
}

const measurerStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: "1px solid",
    zIndex: 1,
} as const

function Boxes(props: { startIndex: number; onDone: () => void }) {
    /**
     * Port note: upstream resets `currentIndex` during render when `startIndex` changes, which is
     * a writable memo in Solid.
     */
    const [currentIndex, setCurrentIndex] = createSignal(() => props.startIndex)

    onSettled(() => {
        if (props.startIndex < maxNum - 1) {
            setCurrentIndex((index) => index + 1)
        }
    })

    return (
        <div>
            {Array.from({ length: maxNum }, (_, index) => (
                <div style={boxStyle}>
                    <AnimatePresence
                        onExitComplete={() =>
                            index === maxNum - 1 && props.onDone()
                        }
                    >
                        <Show when={currentIndex() === index}>
                            <motion.div
                                layout
                                layoutId="measurer"
                                style={measurerStyle}
                                onLayoutAnimationComplete={() => {
                                    if (currentIndex() < maxNum - 1) {
                                        setCurrentIndex((idx) => idx + 1)
                                    }
                                }}
                            />
                        </Show>
                    </AnimatePresence>
                </div>
            ))}
        </div>
    )
}

function App() {
    const [startIndex, setStartIndex] = createSignal(0)
    const [doneCount, setDoneCount] = createSignal(0)

    return (
        <>
            <Boxes
                startIndex={startIndex()}
                onDone={() => setDoneCount((c) => c + 1)}
            />
            <span id="done-count">{doneCount()}</span>
            <button id="start-1" onClick={() => setStartIndex(1)}>
                start 1
            </button>
        </>
    )
}

describe("AnimatePresence onExitComplete", () => {
    it("Only fires once when layoutId child exits and re-enters", async () => {
        await visit(App)
        await wait(2000) // Wait for initial layout animations to settle
        await should(() => {
            expect(query("#done-count").textContent).toBe("0")
        })
        trigger(query("#start-1"), "click", { x: 10, y: 10, force: true })
        await wait(3000) // Wait for all layout animations to complete
        await should(() => {
            expect(query("#done-count").textContent).toBe("1")
        })
    }, 15000)
})
