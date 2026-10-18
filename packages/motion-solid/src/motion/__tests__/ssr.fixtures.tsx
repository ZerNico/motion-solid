import type { JSX } from "@solidjs/web"
import { NoHydration } from "@solidjs/web"
import { motionValue } from "motion-dom"
import { createSignal } from "solid-js"
import { useMotionValue } from "../../"
import { AnimatePresence } from "../../components/AnimatePresence"
import { Reorder } from "../../components/Reorder"
import { motion } from "../../render/components/motion/proxy"

/**
 * Port note: server-rendered trees have to be exported from a `*.fixtures.tsx` module, and
 * their props have to be serializable. So upstream's inline elements are the cases of `Case`,
 * picked by name. `static` renders them inside `<NoHydration>`, Solid's counterpart of
 * `renderToStaticMarkup` (no hydration keys).
 */
interface CustomProps {
    foo: string
}

/**
 * Port note: Solid components receive `ref` as a prop and forward it, no `forwardRef`.
 */
const CustomMotionComponent = motion.create(
    (props: CustomProps & { ref?: (element: HTMLDivElement) => void }) => {
        return <div {...props} />
    }
)
const CustomMotionDiv = motion.create("div")
const CustomMotionCircle = motion.create("circle")
const CustomElement = motion.create("element-test")

function TypesAndRuntime() {
    let divRef: HTMLDivElement | undefined
    let buttonRef: HTMLButtonElement | undefined
    let circleRef: SVGCircleElement | undefined
    const value = useMotionValue(0)
    return (
        <>
            <motion.div
                ref={(element) => (divRef = element)}
                initial={{ x: 100 }}
                whileTap={{ opacity: 0 }}
                drag
                layout
                layoutId="a"
                style={{ opacity: 1 }}
                data-testid="box"
            />
            <motion.button ref={(element) => (buttonRef = element)} disabled />
            <motion.circle
                ref={(element) => (circleRef = element)}
                cx={1}
                cy={value}
            />
            <CustomMotionDiv
                ref={(element: HTMLDivElement) => (divRef = element)}
                initial={{ x: 100 }}
                whileTap={{ opacity: 0 }}
                drag
                layout
                layoutId="a"
                style={{ opacity: 1 }}
                data-testid="box"
            />
            <CustomMotionComponent
                ref={(element: HTMLDivElement) => (divRef = element)}
                foo="test"
                whileTap={{ opacity: 0 }}
            />
            <CustomMotionCircle
                ref={(element: SVGCircleElement) => (circleRef = element)}
                whileTap={{ opacity: 0 }}
                cx={1}
                cy={value}
            />
            {void [divRef, buttonRef, circleRef]}
        </>
    )
}

function ReorderDefault() {
    const [state, setState] = createSignal<any[]>([0])
    return (
        <Reorder.Group onReorder={setState} values={state()}>
            <Reorder.Item value="a" />
        </Reorder.Group>
    )
}

function ReorderNoDragListener() {
    const [state, setState] = createSignal<any[]>([0])
    return (
        <Reorder.Group onReorder={setState} values={state()}>
            <Reorder.Item value="a" dragListener={false} />
        </Reorder.Group>
    )
}

function ReorderAs() {
    const [state, setState] = createSignal<any[]>([0])
    return (
        <Reorder.Group as="div" onReorder={setState} values={state()}>
            <Reorder.Item as="div" value="a" />
        </Reorder.Group>
    )
}

function MotionValueChild() {
    const value = useMotionValue(5)

    return <motion.div>{value}</motion.div>
}

const cases = {
    typesAndRuntime: () => <TypesAndRuntime />,

    // "only renders independent transforms the user has given a value"
    styleX: () => <motion.div style={{ x: 100 }} />,
    styleXAnimateX: () => (
        <motion.div style={{ x: 100 }} animate={{ x: 200 }} />
    ),
    styleMotionValueXAnimateX: () => (
        <motion.div style={{ x: motionValue(100) }} animate={{ x: 200 }} />
    ),
    initialXAnimateX: () => (
        <motion.div initial={{ x: 50 }} animate={{ x: 200 }} />
    ),
    animateX: () => <motion.div animate={{ x: 200 }} />,
    animateXKeyframes: () => <motion.div animate={{ x: [50, 100] }} />,
    initialFalseAnimateX: () => (
        <motion.div initial={false} animate={{ x: 200 }} />
    ),
    styleXAnimateRotate: () => (
        <motion.div style={{ x: 100 }} animate={{ rotate: 45 }} />
    ),
    styleXVariantRotate: () => (
        <motion.div
            style={{ x: 100 }}
            variants={{ visible: { rotate: 45 } }}
            animate="visible"
        />
    ),
    initialXAnimateRotate: () => (
        <motion.div initial={{ x: 50 }} animate={{ rotate: 45 }} />
    ),
    styleTransformAnimateX: () => (
        <motion.div
            style={{ transform: "translateX(10px)" }}
            animate={{ x: 200 }}
        />
    ),

    html: () => {
        const y = motionValue(200)
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ x: 100 }}
                    animate={{ x: 50 }}
                    style={{ y }}
                    exit={{ x: 0 }}
                    values={{ customValue: y }}
                />
            </AnimatePresence>
        )
    },
    customElement: () => {
        const y = motionValue(200)
        return (
            <AnimatePresence>
                <CustomElement
                    initial={{ x: 100 }}
                    animate={{ x: 50 }}
                    style={{ y }}
                    exit={{ x: 0 }}
                />
            </AnimatePresence>
        )
    },
    svgCircle: () => {
        const cx = motionValue(100)
        const pathLength = motionValue(0.5)
        return (
            <motion.circle
                cx={cx}
                initial={{ strokeWidth: 10 }}
                style={{
                    background: "#fff",
                    pathLength,
                    x: 100,
                }}
            />
        )
    },
    svgRect: () => (
        <AnimatePresence>
            <motion.rect
                initial={{ x: 0 }}
                animate={{ x: 100 }}
                exit={{ x: 0 }}
                mask=""
                style={{
                    background: "#fff",
                }}
                class="test"
                onMouseMove={() => {}}
            />
        </AnimatePresence>
    ),
    svgPath: () => (
        <AnimatePresence>
            <motion.path
                initial={{ x: 0 }}
                animate={{ x: 100 }}
                exit={{ x: 0 }}
                mask=""
                style={{
                    background: "#fff",
                    transformBox: "view-box",
                }}
                class="test"
                onMouseMove={() => {}}
            />
        </AnimatePresence>
    ),

    initialOverridesStyle: () => (
        <motion.div initial={{ x: 100 }} style={{ x: 200 }} />
    ),
    onTap: () => <motion.div onTap={() => {}} />,
    whileTap: () => <motion.div whileTap={{ scale: 2 }} />,
    tabindex: () => <motion.div tabindex={2} whileTap={{ scale: 2 }} />,
    initialFalseKeyframes: () => (
        <motion.div
            initial={false}
            animate={{ x: [0, 100] }}
            style={{ x: 200 }}
        />
    ),

    reorderDefault: () => <ReorderDefault />,
    reorderNoDragListener: () => <ReorderNoDragListener />,
    reorderAs: () => <ReorderAs />,

    motionValueChild: () => <MotionValueChild />,
} satisfies Record<string, () => JSX.Element>

export type CaseName = keyof typeof cases

export function Case(props: { name: CaseName; static?: boolean }) {
    const render = cases[props.name]
    return props.static ? <NoHydration>{render()}</NoHydration> : render()
}
