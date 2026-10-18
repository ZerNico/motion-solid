/**
 * Port of upstream's `cypress/integration/svg-style-on-mount.ts` and its page,
 * `dev/react/src/tests/svg-style-on-mount.tsx`.
 */
import { motion, useMotionValue, useTransform } from "../../src"
import { query, visit } from "./utils"

/**
 * Port note: upstream runs in Chrome/Electron, which serializes `transform-origin: 50% 50%` as
 * set. Firefox serializes it as "50% 50% 0px", so the expected value is read back the same way.
 */
function serializedOrigin(origin: string) {
    const probe = document.createElement("div")
    probe.style.transformOrigin = origin
    return probe.style.transformOrigin
}

/**
 * Test: SVG styles should apply correctly on mount when using useTransform.
 * Reproduction for #2949: SVG transform-origin and styles not applying on mount.
 *
 * The bug: SVG elements with transforms derived from useTransform would have
 * incorrect transformOrigin and transformBox on initial mount, causing a visible
 * jump when the visual element takes over rendering.
 */
function App() {
    const x = useMotionValue(50)

    // Derived transform values via useTransform
    const pathLength = useTransform(x, [0, 100], [0, 1])
    const opacity = useTransform(x, [0, 100], [0, 1])
    const fill = useTransform(x, [0, 100], ["#0000ff", "#ff0000"])

    return (
        <svg width="200" height="200" data-testid="svg">
            {/* Path with useTransform-derived pathLength + opacity + CSS transform */}
            <motion.path
                id="path"
                d="M 10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80"
                fill="none"
                stroke="black"
                stroke-width="2"
                style={{ pathLength, opacity, x: 10, y: 10 }}
            />
            {/* Circle with useTransform-derived fill */}
            <motion.circle id="circle" cx="100" cy="100" r="40" fill={fill} />
            {/* Rect with static transform to test transformBox/transformOrigin */}
            <motion.rect
                id="rect"
                x="10"
                y="10"
                width="50"
                height="50"
                style={{ rotate: 45 }}
            />
        </svg>
    )
}

/**
 * Tests for #2949: SVG styles not applying on mount.
 *
 * The bug: SVG elements using useTransform-derived values would have
 * incorrect transformOrigin/transformBox on initial mount (before
 * dimensions are measured), causing a visible "jump" when the visual
 * element takes over.
 *
 * The fix: Always set transformBox to "fill-box" and transformOrigin
 * to "50% 50%" on SVG elements with transforms, even before dimensions
 * are measured.
 */
describe("SVG styles on mount (#2949)", () => {
    it("Applies transform, transformBox, and transformOrigin on mount", async () => {
        await visit(App)
        const path = query("#path")
        // Transform should be applied immediately on mount
        expect(path.style.transform).toContain("translateX(10px)")
        expect(path.style.transform).toContain("translateY(10px)")

        // transformBox must be "fill-box" on initial mount
        // (this was the core of the #2949 bug — it was missing)
        expect(path.style.transformBox).toBe("fill-box")

        // transformOrigin must be set to prevent jumping
        expect(path.style.transformOrigin).toBe(serializedOrigin("50% 50%"))
    })

    it("Applies useTransform-derived pathLength attributes on mount", async () => {
        await visit(App)
        const path = query("#path")
        // pathLength should be 0.5 (useTransform(50, [0,100], [0,1]))
        // buildSVGPath normalizes the pathLength attribute to 1
        expect(path.getAttribute("pathLength")).toBe("1")

        // stroke-dasharray should reflect pathLength=0.5
        expect(path.getAttribute("stroke-dasharray")).toBe("0.5 1")

        // stroke-dashoffset should be 0 (pathOffset defaults to 0)
        const dashoffset = path.getAttribute("stroke-dashoffset")!
        expect(parseFloat(dashoffset)).toBe(0)
    })

    it("Applies useTransform-derived opacity on SVG path on mount", async () => {
        await visit(App)
        const path = query("#path")
        // opacity should be 0.5 (useTransform(50, [0,100], [0,1]))
        const opacity =
            path.getAttribute("opacity") ??
            window.getComputedStyle(path).opacity
        expect(parseFloat(opacity)).toBe(0.5)
    })

    it("Applies useTransform-derived fill on SVG circle on mount", async () => {
        await visit(App)
        const circle = query("#circle")
        // fill should be interpolated (not null/empty/default)
        const fill = circle.getAttribute("fill")
        expect(fill).not.toBeNull()
        expect(fill).not.toBe("")
    })

    it("Applies transformBox and transformOrigin on SVG rect with static transform", async () => {
        await visit(App)
        const rect = query("#rect")
        expect(rect.style.transform).toBe("rotate(45deg)")
        expect(rect.style.transformBox).toBe("fill-box")
        expect(rect.style.transformOrigin).toBe(serializedOrigin("50% 50%"))
    })
})
