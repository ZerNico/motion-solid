/**
 * Port of upstream's `cypress/integration/animate-unresolved-origin.ts` and its page,
 * `dev/react/src/tests/animate-unresolved-origin.tsx`.
 */
import { For } from "solid-js"
import { motion } from "../../src"
import { query, visit, wait } from "./utils"

/**
 * Values animated without a base value must not be rendered before their
 * origin is read, or the read picks up the placeholder write (#2791).
 */
const pointPairs = [
    ["0,20 550,38", "720,38 712,50 389,50 380,36"],
    ["710,38 712,50 389,50 380,36", "850,38 830,50 400,50 390,36"],
]

function App() {
    return (
        <>
            <svg width="900" height="100">
                <For each={pointPairs}>
                    {([from, to], i) => (
                        <motion.polygon
                            points={from}
                            animate={{ points: to }}
                            transition={{
                                delay: 0.2 * i(),
                                duration: 3,
                                type: "spring",
                            }}
                        />
                    )}
                </For>
            </svg>
            <div style={{ "--x": "50" }}>
                <motion.div
                    id="css-var"
                    animate={{ "--x": 100 }}
                    transition={{ ease: "linear", duration: 10 }}
                />
            </div>
        </>
    )
}

describe("Values without a base value", () => {
    let restore: (() => void) | undefined
    afterEach(() => restore?.())

    it("never write undefined or NaN SVG attributes", async () => {
        const points: string[] = []

        // Port note: upstream patches `setAttribute` in `onBeforeLoad`, before the page renders.
        const setAttribute = Element.prototype.setAttribute
        Element.prototype.setAttribute = function (
            name: string,
            value: string
        ) {
            if (name === "points") points.push(String(value))
            return setAttribute.call(this, name, value)
        }
        restore = () => (Element.prototype.setAttribute = setAttribute)

        await visit(App)
        await wait(1000)
        expect(points.length).toBeGreaterThan(2)
        points.forEach((value) => expect(value).not.toMatch(/NaN|undefined/u))
    })

    it("animate CSS variables from their inherited value", async () => {
        await visit(App)
        await wait(5000)
        const x = parseFloat(
            getComputedStyle(query("#css-var")).getPropertyValue("--x")
        )
        expect(x).toBeGreaterThanOrEqual(65)
        expect(x).toBeLessThanOrEqual(85)
    }, 15000)
})
