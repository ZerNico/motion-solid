/**
 * Port of upstream's `cypress/integration/drag-svg-viewbox.ts` and its page,
 * `dev/react/src/tests/drag-svg-viewbox.tsx`.
 */
import { createSignal } from "solid-js"
import { motion, MotionConfig, transformViewBoxPoint } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

interface Params {
    viewBoxX?: string
    viewBoxY?: string
    viewBoxWidth?: string
    viewBoxHeight?: string
    svgWidth?: string
    svgHeight?: string
}

/**
 * Test for SVG drag with mismatched viewBox and dimensions.
 *
 * When an SVG has viewBox="0 0 100 100" but width/height="500",
 * dragging should correctly transform pointer coordinates.
 *
 * A mouse movement of 100 pixels in screen space should translate to
 * 20 units in SVG coordinate space (100 * 100/500 = 20).
 */
function App(props: Params) {
    const [svgRef, setSvgRef] = createSignal<SVGSVGElement>()

    // Default: viewBox is 100x100 but rendered size is 500x500
    // This creates a 5x scale factor
    const viewBoxX = parseFloat(props.viewBoxX || "0")
    const viewBoxY = parseFloat(props.viewBoxY || "0")
    const viewBoxWidth = parseFloat(props.viewBoxWidth || "100")
    const viewBoxHeight = parseFloat(props.viewBoxHeight || "100")
    const svgWidth = parseFloat(props.svgWidth || "500")
    const svgHeight = parseFloat(props.svgHeight || "500")

    return (
        <MotionConfig transformPagePoint={transformViewBoxPoint(svgRef)}>
            <svg
                ref={setSvgRef}
                viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
                width={svgWidth}
                height={svgHeight}
                style={{ border: "1px solid black" }}
            >
                <motion.rect
                    data-testid="draggable"
                    x={10}
                    y={10}
                    width={20}
                    height={20}
                    fill="red"
                    drag
                    dragElastic={0}
                    dragMomentum={false}
                />
            </svg>
        </MotionConfig>
    )
}

/**
 * Extract translateX and translateY values from a CSS transform string.
 */
function parseTranslate(transform: string): { x: number; y: number } {
    const xMatch = transform.match(/translateX\(([-\d.]+)px\)/)
    const yMatch = transform.match(/translateY\(([-\d.]+)px\)/)
    return {
        x: xMatch ? parseFloat(xMatch[1]) : 0,
        y: yMatch ? parseFloat(yMatch[1]) : 0,
    }
}

const closeTo = (actual: number, expected: number, delta: number) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(delta)

const draggable = () => query<SVGRectElement>("[data-testid='draggable']")

async function drag() {
    await nextFrame()
    await nextFrame()
    trigger(draggable(), "pointerdown", { x: 10, y: 10, force: true })
    await wait(50)
    trigger(draggable(), "pointermove", { x: 20, y: 20, force: true }) // Move past threshold
    await nextFrame()
    trigger(draggable(), "pointermove", { x: 110, y: 110, force: true })
    await nextFrame()
    trigger(draggable(), "pointerup", { force: true })
    await wait(50)
}

/**
 * Tests for SVG drag behavior with mismatched viewBox and rendered dimensions.
 *
 * When an SVG has viewBox="0 0 100 100" but width/height="500",
 * dragging should correctly transform pointer coordinates to match
 * the SVG's coordinate system.
 *
 * The scale factor is calculated as: viewBoxDimension / renderedDimension
 * For viewBox 100x100 at 500x500 pixels: scale = 100/500 = 0.2
 *
 * So moving the mouse 100 pixels should move the element 20 SVG units.
 *
 * Note: framer-motion applies transforms to SVG elements via CSS (style.transform),
 * not the SVG transform attribute.
 *
 * PanSession applies pointermove on the next animation frame, and pointerup
 * discards a move that hasn't been applied yet. Cypress also resolves trigger
 * coordinates against the element's current box. So each pointermove is
 * followed by nextFrame() rather than a fixed wait, which slow CI can outrun.
 */
describe("Drag SVG with viewBox", () => {
    it("Correctly scales drag distance when viewBox differs from rendered size", async () => {
        // viewBox is 100x100, rendered size is 500x500
        // Scale factor (screen to SVG): 100/500 = 0.2
        // Rect starts at SVG coords (10, 10) with size (20, 20)
        // Screen position = SVG coords * 5 (due to 500/100 ratio)
        // Initial screen position: (10*5, 10*5) = (50, 50) relative to SVG
        await visit(App)
        await wait(50)
        await should(() => {
            // Verify initial position
            expect(draggable().getAttribute("x")).toBe("10")
            expect(draggable().getAttribute("y")).toBe("10")
        })
        // Move 100 pixels in screen space
        // This should translate to 20 SVG units (100 * 0.2)
        // Final SVG coords: (10+20, 10+20) = (30, 30)
        // Final screen position: (30*5, 30*5) = (150, 150) relative to SVG
        await drag()
        await should(() => {
            // Check CSS transform which framer-motion uses for SVG elements
            const { x, y } = parseTranslate(draggable().style.transform)
            // The element should have moved ~20 SVG units (100px * 0.2 scale)
            // Allow some tolerance for Cypress coordinate handling
            closeTo(x, 20, 3)
            closeTo(y, 20, 3)
        })
    })

    it("Works correctly when viewBox matches rendered size (no scaling)", async () => {
        // viewBox and rendered size both 500x500 - no scaling needed
        await visit(App, {
            viewBoxWidth: "500",
            viewBoxHeight: "500",
            svgWidth: "500",
            svgHeight: "500",
        })
        await wait(50)
        await drag()
        await should(() => {
            const { x, y } = parseTranslate(draggable().style.transform)
            // No scaling - 100px movement = 100 SVG units
            // Allow ~15% tolerance for Cypress coordinate handling variance
            closeTo(x, 100, 15)
            closeTo(y, 100, 15)
        })
    })

    it("Handles non-uniform scaling (different x and y scale factors)", async () => {
        // viewBox is 100x200, rendered is 500x400
        // X scale: 100/500 = 0.2, Y scale: 200/400 = 0.5
        await visit(App, {
            viewBoxWidth: "100",
            viewBoxHeight: "200",
            svgWidth: "500",
            svgHeight: "400",
        })
        await wait(50)
        // Move 100 pixels in both directions
        // X: 100 * 0.2 = 20 SVG units
        // Y: 100 * 0.5 = 50 SVG units
        await drag()
        await should(() => {
            const { x, y } = parseTranslate(draggable().style.transform)
            // Allow some tolerance for Cypress coordinate handling
            closeTo(x, 20, 3)
            closeTo(y, 50, 8)
        })
    })

    it("Handles viewBox with non-zero origin", async () => {
        // viewBox starts at (50, 50) with size 100x100, rendered at 500x500
        // Scale factor: 100/500 = 0.2
        // The viewBox origin offset shouldn't affect drag deltas
        await visit(App, {
            viewBoxX: "50",
            viewBoxY: "50",
            viewBoxWidth: "100",
            viewBoxHeight: "100",
            svgWidth: "500",
            svgHeight: "500",
        })
        await wait(50)
        // Move 100 pixels in screen space
        // This should translate to 20 SVG units (100 * 0.2)
        await drag()
        await should(() => {
            const { x, y } = parseTranslate(draggable().style.transform)
            // The element should have moved ~20 SVG units (100px * 0.2 scale)
            // ViewBox origin offset should not affect the drag delta
            closeTo(x, 20, 3)
            closeTo(y, 20, 3)
        })
    })
})
