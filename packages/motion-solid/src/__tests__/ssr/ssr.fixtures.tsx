import { motionValue } from "motion-dom"
import { createSignal } from "solid-js"
import { AnimatePresence, motion, Show, useMotionValueAccessor } from "../.."

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

export function MotionValueAccessor() {
    const a = motionValue(1)
    const b = motionValue(2)
    const [source, setSource] = createSignal(a)
    const value = useMotionValueAccessor(source)
    const plain = useMotionValueAccessor(b)
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
