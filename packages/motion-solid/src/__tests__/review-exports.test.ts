import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import * as motionDom from "motion-dom"
import * as entry from ".."
import type { SVGAttributesAsMotionValues, SVGMotionProps } from ".."
import * as debugEntry from "../debug"
import * as domEntry from "../dom"
import * as domMiniEntry from "../dom-mini"
import * as miniEntry from "../mini"
import * as projectionEntry from "../projection"

describe("package entry", () => {
    test("`delay` takes milliseconds, like upstream", async () => {
        expect(entry.delay).toBe(motionDom.delay)
        const start = performance.now()
        const elapsed = await new Promise<number>((resolve) =>
            entry.delay(() => resolve(performance.now() - start), 50)
        )
        expect(elapsed).toBeGreaterThanOrEqual(40)
        expect(elapsed).toBeLessThan(1000)
    })

    test("`@motion-s/solid/dom`'s `delay` takes seconds, like upstream's `motion` (dom)", () => {
        expect(domEntry.delay).toBe(motionDom.delayInSeconds)
    })

    test("exports upstream's public utilities", () => {
        expect(typeof entry.transformViewBoxPoint).toBe("function")
        expect(typeof entry.correctParentTransform).toBe("function")
        expect(typeof entry.isBrowser).toBe("boolean")
        expect(typeof entry.useUnmountEffect).toBe("function")
        expect(entry.animate).toBe(domEntry.animate)
    })

    test("SVG prop types are exported", () => {
        const props: SVGMotionProps<"circle"> = { cx: 10, animate: { r: 2 } }
        const values: SVGAttributesAsMotionValues<{ cx?: number }> = {
            cx: motionDom.motionValue(1),
        }
        expect(props && values).toBeTruthy()
    })

    test("transformViewBoxPoint and correctParentTransform accept an element, an accessor or a { current } object", () => {
        const point = { x: 10, y: 20 }
        expect(entry.transformViewBoxPoint(() => null)(point)).toBe(point)
        expect(entry.transformViewBoxPoint({ current: null })(point)).toBe(
            point
        )
        const parent = document.createElement("div")
        document.body.appendChild(parent)
        expect(entry.correctParentTransform(parent)(point)).toBe(point)
        expect(entry.correctParentTransform(() => parent)(point)).toBe(point)
        parent.remove()
    })

    test("subpath entries", () => {
        expect(miniEntry.useAnimate).toBe(entry.useAnimateMini)
        expect(domMiniEntry.animate).toBe(entry.animateMini)
        expect(typeof domMiniEntry.animateSequence).toBe("function")
        expect(debugEntry.recordStats).toBe(motionDom.recordStats)
        expect(projectionEntry.HTMLProjectionNode).toBe(
            motionDom.HTMLProjectionNode
        )

        const packageRoot = resolve(__dirname, "../..")
        const { exports } = JSON.parse(
            readFileSync(resolve(packageRoot, "package.json"), "utf8")
        ) as { exports: Record<string, string> }
        expect(Object.keys(exports).sort()).toEqual(
            [
                ".",
                "./debug",
                "./dom",
                "./dom/mini",
                "./mini",
                "./package.json",
                "./projection",
            ].sort()
        )
        for (const target of Object.values(exports)) {
            expect(existsSync(resolve(packageRoot, target))).toBe(true)
        }
    })
})
