/**
 * Port of upstream's `cypress/integration/layout-resize.ts` and its page,
 * `dev/react/src/tests/layout-resize.tsx`.
 */
import { createSignal } from "solid-js"
import { page } from "vitest/browser"
import { motion } from "../../src"
import { expectBbox, query, should, trigger, visit, wait } from "./utils"

const box = {
    position: "absolute",
    top: 0,
    left: 0,
    background: "red",
} as const

const a = {
    ...box,
    width: 100,
    height: 100,
}

const b = {
    ...box,
    width: 400,
    height: 200,
    top: 100,
    left: 100,
}

function App(props: { type?: true | "position" | "size" }) {
    const [state, setState] = createSignal(true)

    return (
        <motion.div
            id="box"
            data-testid="box"
            layout={props.type ?? true}
            style={{ ...(state() ? a : b) }}
            onClick={() => setState(!state())}
            transition={{ duration: 3 }}
        >
            <motion.div
                layout
                id="child"
                style={{ width: 100, height: 100, background: "blue" }}
                transition={{ duration: 3 }}
            />
        </motion.div>
    )
}

describe("Resize window", () => {
    it("Finishes the animation and blocks animation on immediate layout animations until 250ms", async () => {
        await visit(App)
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 100,
                height: 100,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 0,
                left: 0,
                width: 100,
                height: 100,
            })
        )

        trigger(query("#box"), "click")
        await wait(50)
        await page.viewport(200, 200)
        await wait(100)
        await should(() =>
            expectBbox(query("#box"), {
                top: 100,
                left: 100,
                width: 400,
                height: 200,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 100,
                left: 100,
                width: 100,
                height: 100,
            })
        )

        trigger(query("#box"), "click", { force: true })
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 100,
                height: 100,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 0,
                left: 0,
                width: 100,
                height: 100,
            })
        )

        await wait(200)
        trigger(query("#box"), "click", { force: true })
        await wait(300)
        await should(() => {
            const bbox = query("#box").getBoundingClientRect()
            expect(Math.round(bbox.top)).not.toBe(0)
            expect(Math.round(bbox.top)).not.toBe(100)
        })
    })
})
