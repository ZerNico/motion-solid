/**
 * Port of upstream's `cypress/integration/transition-arc.ts` and its page,
 * `dev/react/src/tests/transition-arc.tsx`.
 *
 * Tests for the `path: arc()` transition modifier across both layout
 * animations (`transition.layout.path`) and keyframe animations
 * (`transition.path`).
 *
 * Layout-arc tests use `variant: "freeze"` (or `none`/`small`) which use
 * `ease: () => 0.5` to pin the layout animation at exactly 50% progress.
 * That lets us sample mid-arc position with `getBoundingClientRect()`
 * without fighting timing.
 *
 * Port note: the page's demo-only variants (`ping-pong`, `axis-change`), which no test visits,
 * aren't ported.
 */
import { createSignal, onSettled, Show } from "solid-js"
import { arc, LayoutGroup, motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const ITEM_A = { left: "50px", top: "200px", width: "100px", height: "50px" }
const ITEM_B = { left: "450px", top: "200px", width: "100px", height: "50px" }
const ITEM_B_NEAR = {
    left: "60px",
    top: "200px",
    width: "100px",
    height: "50px",
}

interface PageProps {
    variant?: string
    freeze?: string
    freezeAt?: string
}

/**
 * URL variants:
 *   default       — auto-toggling layout arc, real ease (visual demo)
 *   freeze        — ease() => 0.5 to pin layout animation at midpoint
 *   none          — like freeze but no `path` (linear baseline)
 *   small         — sub-threshold distance, falls back to linear
 *   keyframe      — keyframe arc with a Toggle button
 *   oriented      — keyframe arc with rotate: true
 *   freezeAt=N    — pin keyframe animation at fraction N (0..1)
 *   interrupt     — auto-toggle layout fast, mid-flight (continuity demo)
 *   cw            — direction locked clockwise
 *   ccw           — direction locked counter-clockwise
 */
function App(props: PageProps) {
    const variant = props.variant || "default"

    if (variant === "keyframe" || variant === "oriented") {
        return <KeyframeArc oriented={variant === "oriented"} {...props} />
    }

    if (variant === "rotate-compose") return <RotateCompose />

    return <LayoutArc variant={variant} />
}

function LayoutArc(props: { variant: string }) {
    const variant = props.variant
    const isSmall = variant === "small"
    const itemB = isSmall ? ITEM_B_NEAR : ITEM_B
    const isFreeze = variant === "freeze" || variant === "none" || isSmall
    const direction =
        variant === "cw" ? "cw" : variant === "ccw" ? "ccw" : undefined
    const ease = isFreeze ? () => 0.5 : undefined
    const duration = isFreeze ? 4 : 1.2

    // Created once, so its closure (prevBulgeSign) survives updates.
    const path =
        variant === "none" ? undefined : arc({ strength: 1, direction })

    const transition: any = { duration, ...(ease ? { ease } : {}) }
    if (path) transition.path = path

    const [active, setActive] = createSignal<"a" | "b">("a")

    onSettled(() => {
        if (isFreeze) return
        const interval = variant === "interrupt" ? 600 : 1500
        const id = window.setInterval(() => {
            setActive((prev) => (prev === "a" ? "b" : "a"))
        }, interval)
        return () => window.clearInterval(id)
    })

    return (
        <div
            id="container"
            style={{ position: "relative", width: "100vw", height: "100vh" }}
        >
            <Hud variant={variant} />
            <button
                id="toggle"
                onClick={() => setActive(active() === "a" ? "b" : "a")}
                style={{ position: "fixed", top: "16px", left: "16px" }}
            >
                Toggle
            </button>
            <LayoutGroup id="arc-test">
                <div id="item-a" style={{ position: "absolute", ...ITEM_A }}>
                    <Show when={active() === "a"}>
                        <motion.div
                            id="indicator"
                            layoutId="indicator"
                            transition={transition}
                            style={{
                                width: 100,
                                height: 100,
                                background: "red",
                            }}
                        />
                    </Show>
                </div>
                <div id="item-b" style={{ position: "absolute", ...itemB }}>
                    <Show when={active() === "b"}>
                        <motion.div
                            id="indicator"
                            layoutId="indicator"
                            transition={transition}
                            style={{
                                width: 100,
                                height: 100,
                                background: "red",
                            }}
                        />
                    </Show>
                </div>
            </LayoutGroup>
        </div>
    )
}

function KeyframeArc(props: PageProps & { oriented: boolean }) {
    const [target, setTarget] = createSignal<"a" | "b">("a")
    const freezeAt =
        props.freezeAt !== undefined
            ? Number(props.freezeAt)
            : props.freeze !== undefined
            ? 0.5
            : undefined
    const path = arc({ strength: 1, rotate: props.oriented })

    return (
        <div
            id="container"
            style={{ position: "relative", width: "100vw", height: "100vh" }}
        >
            <Hud variant={props.oriented ? "oriented" : "keyframe"} />
            <button
                id="toggle"
                onClick={() => setTarget((p) => (p === "a" ? "b" : "a"))}
                style={{ position: "fixed", top: "16px", left: "16px" }}
            >
                Toggle
            </button>
            <motion.div
                id="indicator"
                animate={{ x: target() === "a" ? 0 : 400, y: 0 }}
                transition={{
                    duration: freezeAt !== undefined ? 4 : 1.2,
                    ...(freezeAt !== undefined ? { ease: () => freezeAt } : {}),
                    path,
                }}
                style={{
                    position: "absolute",
                    top: 200,
                    left: 50,
                    width: 100,
                    height: 100,
                    background: "red",
                }}
            />
        </div>
    )
}

/**
 * An oriented arc running *at the same time* as a user `rotate`
 * animation. Frozen at t=0.5: pathRotation is ~0 by symmetry there, so
 * the only rotation in the matrix should be the user's `rotate` at 50%
 * (0 → 90 → 45deg). If the arc clobbered `rotate` (the old behaviour)
 * the element would read ~0deg instead. Proves composition + that the
 * user's value is never overwritten.
 */
function RotateCompose() {
    const [target, setTarget] = createSignal<"a" | "b">("a")
    const path = arc({ strength: 1, rotate: true })

    return (
        <div
            id="container"
            style={{ position: "relative", width: "100vw", height: "100vh" }}
        >
            <Hud variant="rotate-compose" />
            <button
                id="toggle"
                onClick={() => setTarget((p) => (p === "a" ? "b" : "a"))}
                style={{ position: "fixed", top: "16px", left: "16px" }}
            >
                Toggle
            </button>
            <motion.div
                id="indicator"
                animate={{
                    x: target() === "a" ? 0 : 400,
                    y: 0,
                    rotate: target() === "a" ? 0 : 90,
                }}
                transition={{ duration: 4, ease: () => 0.5, path }}
                style={{
                    position: "absolute",
                    top: 200,
                    left: 50,
                    width: 100,
                    height: 100,
                    background: "red",
                }}
            />
        </div>
    )
}

function Hud(props: { variant: string }) {
    return (
        <div
            style={{
                position: "fixed",
                bottom: "12px",
                left: "12px",
                padding: "6px 10px",
                background: "#111",
                color: "#fff",
                font: "12px/1.4 ui-monospace, monospace",
                "border-radius": "4px",
                opacity: 0.85,
            }}
        >
            variant=<b>{props.variant}</b>
        </div>
    )
}

const closeTo = (actual: number, expected: number, delta: number) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(delta)

describe("layout arc", () => {
    it("deviates from the straight-line path mid-animation", async () => {
        await visit(App, { variant: "freeze" })
        await wait(50)
        await should(() =>
            closeTo(query("#indicator").getBoundingClientRect().top, 200, 10)
        )
        trigger(query("#toggle"), "click")
        await wait(100)
        // 400px horizontal, strength=1 → ~200px perpendicular at t=0.5
        await should(() => {
            const { top } = query("#indicator").getBoundingClientRect()
            expect(Math.abs(top - 200)).toBeGreaterThan(80)
        })
    })

    it("stays on the straight-line path without arc config", async () => {
        await visit(App, { variant: "none" })
        await wait(50)
        await should(() =>
            closeTo(query("#indicator").getBoundingClientRect().top, 200, 10)
        )
        trigger(query("#toggle"), "click")
        await wait(100)
        await should(() =>
            closeTo(query("#indicator").getBoundingClientRect().top, 200, 20)
        )
    })

    it("does not arc for movements below the 20px minimum distance", async () => {
        await visit(App, { variant: "small" })
        await wait(50)
        await should(() =>
            closeTo(query("#indicator").getBoundingClientRect().top, 200, 10)
        )
        trigger(query("#toggle"), "click")
        await wait(100)
        await should(() =>
            closeTo(query("#indicator").getBoundingClientRect().top, 200, 20)
        )
    })
})

/**
 * Keyframe arc tests use `freeze` to pin the animation at midpoint
 * (same trick as the layout tests). Click Toggle, wait for the
 * animation start, then sample.
 */
describe("keyframe arc", () => {
    it("deflects y perpendicular while x interpolates", async () => {
        await visit(App, { variant: "keyframe", freeze: "" })
        await wait(50)
        await should(() => {
            // Starts at top:200 with no x translation.
            const r = query("#indicator").getBoundingClientRect()
            closeTo(r.top, 200, 5)
            closeTo(r.left, 50, 5)
        })
        trigger(query("#toggle"), "click")
        await wait(100)
        await should(() => {
            // 400px horizontal, strength=1 → ~200px perpendicular at t=0.5.
            // Because the chord is horizontal and dx>0, auto-direction
            // bulges +y (downward in screen space).
            const r = query("#indicator").getBoundingClientRect()
            // x is roughly midway
            closeTo(r.left, 50 + 200, 25)
            // y has deflected ~200px from baseline
            expect(Math.abs(r.top - 200)).toBeGreaterThan(150)
        })
    })

    it("rotate option rotates the element along the curve", async () => {
        // freezeAt=0.25: at t=0.25 the bezier tangent has clearly diverged
        // from the baseline tangent so rotation is non-zero. (At t=0.5 it
        // crosses zero by symmetry — see KeyframeArc comments.)
        await visit(App, { variant: "oriented", freezeAt: "0.25" })
        await wait(50)
        trigger(query("#toggle"), "click")
        await wait(100)
        await should(() => {
            const t = window.getComputedStyle(query("#indicator")).transform
            // expected a transform matrix
            expect(t).toMatch(/matrix/)
            const m = t.match(/matrix\(([^)]+)\)/)
            if (!m) throw new Error(`unexpected transform: ${t}`)
            // matrix(a, b, c, d, tx, ty). For a pure translate, a=1, b=0.
            // For rotation, |b| > 0 and a < 1.
            const [a, b] = m[1].split(",").map((v) => parseFloat(v))
            // y-shear of matrix is non-zero (rotated)
            expect(Math.abs(b)).toBeGreaterThan(0.05)
            // x-scale is less than 1 (rotated)
            expect(a).toBeLessThan(1)
        })
    })

    it("no rotate option leaves rotation untouched", async () => {
        await visit(App, { variant: "keyframe", freeze: "" })
        await wait(50)
        trigger(query("#toggle"), "click")
        await wait(100)
        await should(() => {
            const t = window.getComputedStyle(query("#indicator")).transform
            const m = t.match(/matrix\(([^)]+)\)/)
            if (!m) return
            const [a, b] = m[1].split(",").map((v) => parseFloat(v))
            // Pure translate: a=1, b=0. Allow tiny float fuzz.
            closeTo(a, 1, 0.01)
            expect(Math.abs(b)).toBeLessThan(0.01)
        })
    })
})

/**
 * An oriented arc running concurrently with a user `rotate` animation.
 * `pathRotation` is composed onto the user's `rotate` at the build site,
 * so the user's value must never be read or clobbered.
 *
 * Frozen at t=0.5: pathRotation ~0 by symmetry, x ~mid, and `rotate`
 * (0 → 90, eased 0.5) ~45deg. The old clobbering behaviour would leave
 * rotation at ~0deg instead.
 */
describe("arc composes with concurrent rotate", () => {
    it("does not clobber a user rotate animation", async () => {
        await visit(App, { variant: "rotate-compose" })
        await wait(50)
        trigger(query("#toggle"), "click")
        await wait(100)
        await should(() => {
            const t = window.getComputedStyle(query("#indicator")).transform
            const m = t.match(/matrix\(([^)]+)\)/)
            if (!m) throw new Error(`expected a matrix, got: ${t}`)
            const [a, b, , , tx] = m[1].split(",").map((v) => parseFloat(v))
            // x interpolated to ~mid (0 → 400, eased 0.5).
            closeTo(tx, 200, 40)
            // Decompose rotation from matrix(a,b,...). Should be ~45deg
            // from the user's rotate; clobbering would give ~0deg.
            const angle = (Math.atan2(b, a) * 180) / Math.PI
            // user rotate (45deg) survived alongside the arc
            closeTo(angle, 45, 12)
        })
    })
})
