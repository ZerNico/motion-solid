import { motionValue } from "motion-dom"
import { createSignal, onSettled } from "solid-js"
import {
    AnimatePresence,
    motion,
    MotionConfig,
    Show,
    useAnimate,
    useMotionValueState,
    useReducedMotion,
    useScroll,
} from "../.."

export function InitialStyles() {
    return (
        <motion.div
            id="box"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.05 }}
            style={{ "background-color": "red" }}
        />
    )
}

export function MotionValues() {
    const x = motionValue(50)
    const count = motionValue(5)
    return (
        <motion.div id="box" style={{ x, opacity: 0.5 }}>
            {count}
        </motion.div>
    )
}

export function Tappable() {
    return <motion.div id="box" onTap={() => {}} />
}

export function Presence() {
    const [show, setShow] = createSignal(true)
    return (
        <>
            <button id="toggle" onClick={() => setShow((value) => !value)} />
            <AnimatePresence>
                <Show when={show()}>
                    <motion.div
                        id="box"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    />
                </Show>
            </AnimatePresence>
        </>
    )
}

export function Layout() {
    const [wide, setWide] = createSignal(false)
    return (
        <motion.div
            id="box"
            layout
            onClick={() => setWide((value) => !value)}
            transition={{ duration: 0.3, ease: "linear" }}
            style={{ width: wide() ? 200 : 100, height: 50 }}
        />
    )
}

export function MotionValueState() {
    const a = motionValue(1)
    const b = motionValue(2)
    const [source, setSource] = createSignal(a)
    const value = useMotionValueState(source)
    const plain = useMotionValueState(b)
    return (
        <>
            <span id="value">{value()}</span>
            <span id="plain">{plain()}</span>
            <motion.div id="box" style={{ x: a }} />
            <button id="switch" onClick={() => setSource(() => b)} />
            <button id="set" onClick={() => b.set(5)} />
        </>
    )
}

export function ScrollContainerSignal() {
    const [container, setContainer] = createSignal<HTMLElement>()
    const { scrollYProgress } = useScroll({ container })
    return (
        <div
            id="container"
            ref={setContainer}
            style={{ height: "100px", overflow: "auto" }}
        >
            <div style={{ height: "300px" }} />
            <motion.div id="bar" style={{ scaleX: scrollYProgress }} />
        </div>
    )
}

export function ReducedMotionText() {
    const shouldReduceMotion = useReducedMotion()
    return <p id="value">{String(shouldReduceMotion())}</p>
}

export function AnimateWhileHydrating() {
    return (
        <MotionConfig reducedMotion="user">
            <AnimatedBox />
        </MotionConfig>
    )
}

function AnimatedBox() {
    const [scope, animate] = useAnimate()
    onSettled(() => {
        animate("#box", { x: 100 }, { duration: 10 })
    })
    return (
        <div ref={scope}>
            <div id="box" />
        </div>
    )
}
