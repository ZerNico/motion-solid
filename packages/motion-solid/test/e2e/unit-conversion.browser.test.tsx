/**
 * Port of upstream's `cypress/integration/unit-conversion.ts` and its pages,
 * `dev/react/src/tests/unit-conversion.tsx`, `unit-conversion-vh.tsx`,
 * `unit-conversion-rotate.tsx`, `unit-conversion-border.tsx` and
 * `unit-conversion-to-zero.tsx`.
 */
import { render } from "@solidjs/testing-library"
import { flush, onSettled, type Component } from "solid-js"
import { page } from "vitest/browser"
import { animate, motion, useCycle, useMotionValue } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * `cy.viewport(width, height).visit(…)`: `visit` always uses Cypress' default viewport, so this
 * renders the page after resizing (`visit` of an empty page injects the base styles).
 */
async function visitAt(App: Component, width: number, height: number) {
    await visit(() => null)
    await page.viewport(width, height)
    await nextFrame()
    await nextFrame()
    render(() => <App />)
    flush()
    await nextFrame()
}

/**
 * An example of animating between different value types
 */
function UnitConversion(props: {
    "use-motion-value"?: string
    roundtrip?: string
}) {
    const isExternalMotionValue = props["use-motion-value"] || false
    // When roundtrip param is present, use a fast animation that completes (for testing calc -> 0 -> calc)
    const isRoundTrip = props.roundtrip !== undefined
    const [x, cycleX] = useCycle<number | string>(0, "calc(3 * var(--width))")
    const xMotionValue = useMotionValue(0 as number | string)
    const value = isExternalMotionValue ? xMotionValue : undefined

    return (
        <motion.div
            initial={false}
            animate={{ x: x() }}
            transition={
                isRoundTrip
                    ? { duration: 0.1 }
                    : { duration: 5, ease: () => 0.5 }
            }
            style={{
                x: value,
                width: 100,
                height: 100,
                background: "#ffaa00",
                "--width": "100px",
            }}
            onClick={() => cycleX()}
            id="box"
        />
    )
}

function UnitConversionVh() {
    return (
        <motion.div
            animate={{ height: "50vh", width: 100 }}
            transition={{ duration: 5, ease: () => 0.5 }}
            style={{ width: "50vw", height: 100, background: "#ffaa00" }}
            id="box"
        />
    )
}

function UnitConversionRotate() {
    let ref!: HTMLDivElement
    onSettled(() => {
        animate(
            ref,
            { width: [0, 100], rotate: [0, 45] },
            { duration: 0.1, ease: "linear" }
        ).then(() => {
            animate(
                ref,
                { width: "50%" },
                {
                    duration: 0.2,
                    ease: "linear",
                    onUpdate: (width: any) => {
                        if (width > 200) {
                            ref.textContent = "Fail"
                        }
                    },
                }
            )
        })
    })

    return (
        <div
            ref={ref}
            style={{
                width: "100px",
                height: "100px",
                background: "#ffaa00",
            }}
            id="box"
        >
            Success
        </div>
    )
}

/**
 * Converting width from px to % on a content-box element with borders.
 * The measured origin must be the used width (100px), not the bounding
 * box width (120px including borders), or the animation starts with a jump.
 */
function UnitConversionBorder() {
    let ref!: HTMLDivElement

    onSettled(() => {
        animate(
            ref,
            { width: "50%" },
            {
                duration: 10,
                ease: "linear",
                onUpdate: (width: any) => {
                    if (typeof width === "number" && width > 110) {
                        ref.textContent = "Fail"
                    }
                },
            }
        )
    })

    return (
        <div style={{ width: "400px" }}>
            <div
                ref={ref}
                id="box"
                style={{
                    width: "100px",
                    height: "100px",
                    "box-sizing": "content-box",
                    border: "10px solid #000",
                    background: "#ffaa00",
                }}
            >
                Success
            </div>
        </div>
    )
}

function UnitConversionToZero() {
    onSettled(() => {
        animate("#box", { y: ["100%", 0] }, { duration: 10, ease: () => 0 })
    })

    return (
        <div
            style={{
                width: "100px",
                height: "100px",
                background: "#ffaa00",
            }}
            id="box"
        />
    )
}

describe("Unit conversion", () => {
    /**
     * Test for GitHub issue #3410
     * When animating from a calc() with CSS variables to a simple value (and back),
     * the animation should complete correctly without getting stuck at intermediate values.
     */
    it("Animate x roundtrip: 0 -> calc -> 0", async () => {
        // Helper to extract translateX value from computed transform matrix
        const getTranslateX = (element: HTMLElement): number => {
            const style = window.getComputedStyle(element)
            const matrix = new DOMMatrix(style.transform)
            return matrix.m41 // translateX is in m41
        }

        await visit(UnitConversion, { roundtrip: "true" })
        await wait(200)
        await should(() => {
            const box = query("#box")
            // Initial position should be 0
            expect(getTranslateX(box)).toBe(0)
            // Initial style should be none or translateX(0px)
            expect(box.style.transform).toMatch(/^(none|translateX\(0px\))$/)
        })
        // First click: 0 -> calc(3 * var(--width)) = 300px
        trigger(query("#box"), "click")
        await should(() => {
            const box = query("#box")
            // Computed position should be 300px
            expect(getTranslateX(box)).toBe(300)
            // Style should preserve the calc expression
            expect(box.style.transform).toBe(
                "translateX(calc(3 * var(--width)))"
            )
        })
        // Second click: calc(300px) -> 0
        trigger(query("#box"), "click")
        await should(() => {
            const box = query("#box")
            // Computed position should be back to 0
            expect(getTranslateX(box)).toBe(0)
            // Style should be none (transform cleared when returning to default)
            expect(box.style.transform).toBe("none")
        })
    })

    it("Animate x from 0 to calc", async () => {
        await visit(UnitConversion)
        await wait(100)
        trigger(query("#box"), "click")
        await should(() => {
            const { left } = query("#box").getBoundingClientRect()
            expect(left).toBe(150)
        })
    })

    it("Animate x from 0 to calc with externally-defined motion value", async () => {
        await visit(UnitConversion, { "use-motion-value": "true" })
        await wait(100)
        trigger(query("#box"), "click")
        await should(() => {
            const { left } = query("#box").getBoundingClientRect()
            expect(left).toBe(150)
        })
    })

    it("Animate width and height to/from vh units", async () => {
        await visitAt(UnitConversionVh, 400, 400)
        await wait(100)
        await should(() => {
            const { width, height } = query("#box").getBoundingClientRect()
            expect(width).toBe(150)
            expect(height).toBe(150)
        })
    })

    it("Restores unapplied transforms", async () => {
        await visitAt(UnitConversionRotate, 400, 400)
        await wait(300)
        await should(() => {
            const box = query("#box")
            expect(box.style.transform).toBe("rotate(45deg)")
            expect(box.textContent).toBe("Success")
        })
    })

    it("Measures the used width, not the bounding box, on bordered elements", async () => {
        await visitAt(UnitConversionBorder, 600, 400)
        await wait(200)
        const box = query("#box")
        // 10s linear from 100px to 200px: barely moved after 200ms
        const width = parseFloat(getComputedStyle(box).width)
        expect(width).toBeGreaterThan(99)
        expect(width).toBeLessThan(110)
        expect(box.textContent).toBe("Success")
    })

    it("Coerces none keyframes before measuring", async () => {
        await visitAt(UnitConversionToZero, 400, 400)
        await wait(100)
        await should(() => {
            const { top } = query("#box").getBoundingClientRect()
            expect(top).toBe(100)
        })
    })
})
