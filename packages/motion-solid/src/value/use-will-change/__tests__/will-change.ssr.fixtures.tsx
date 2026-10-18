import type { JSX } from "@solidjs/web"
import { NoHydration } from "@solidjs/web"
import { motionValue } from "motion-dom"
import { MotionConfig, motion } from "../../../"

/**
 * Port note: server-rendered trees have to be exported from a `*.fixtures.tsx` module, and
 * their props have to be serializable. So upstream's inline elements are the cases of `Case`,
 * picked by name. `static` renders them inside `<NoHydration>`, Solid's counterpart of
 * `renderToStaticMarkup` (no hydration keys).
 */
const cases = {
    notApplied: () => (
        <motion.div
            initial={
                {
                    x: 100,
                    clipPath: "inset(10px)",
                    "--color": "#000",
                } as any
            }
            animate={
                {
                    x: 200,
                    clipPath: "inset(20px)",
                    "--color": "#fff",
                } as any
            }
        />
    ),
    staticMode: () => (
        <MotionConfig isStatic>
            <motion.div
                initial={{ x: 100, clipPath: "inset(10px)" } as any}
                animate={{ x: 200, clipPath: "inset(20px)" } as any}
            />
        </MotionConfig>
    ),
    manuallySet: () => (
        <motion.div
            initial={{ x: 100, "--color": "#000" } as any}
            animate={{ x: 200 }}
            style={{ willChange: "opacity" }}
        />
    ),
    manuallySetWithoutAnimatedValues: () => (
        <motion.div style={{ willChange: "opacity" }} />
    ),
    withoutAnimatedValues: () => <motion.div style={{}} />,
    externalMotionValue: () => {
        const opacity = motionValue(0.5)
        return <motion.div style={{ opacity }} />
    },
    manuallySetByMotionValue: () => {
        const willChange = motionValue("opacity")
        return (
            <motion.div
                initial={{ x: 100, "--color": "#000" } as any}
                animate={{ x: 200 }}
                style={{ willChange }}
            />
        )
    },
    isStatic: () => (
        <MotionConfig isStatic>
            <motion.div
                initial={{ x: 100, "--color": "#000" } as any}
                animate={{ x: 200 }}
            />
        </MotionConfig>
    ),
} satisfies Record<string, () => JSX.Element>

export type CaseName = keyof typeof cases

export function Case(props: { name: CaseName; static?: boolean }) {
    const render = cases[props.name]
    return props.static ? <NoHydration>{render()}</NoHydration> : render()
}
