import { motionValue, type MotionValue } from "motion-dom"

/**
 * Creates a `MotionValue` to track the state and velocity of a value.
 *
 * Usually, these are created automatically. For advanced use-cases, like use with `useTransform`, you can create `MotionValue`s externally and pass them into the animated component via the `style` prop.
 *
 * ```jsx
 * export const MyComponent = () => {
 *   const scale = useMotionValue(1)
 *
 *   return <motion.div style={{ scale }} />
 * }
 * ```
 *
 * Port note: upstream re-renders the component on changes in a static `MotionConfig`. Solid
 * components don't re-render: read the value with `useMotionValueState` instead.
 *
 * @param initial - The initial state.
 *
 * @public
 */
export function useMotionValue<T>(initial: T): MotionValue<T> {
    return motionValue(initial)
}
