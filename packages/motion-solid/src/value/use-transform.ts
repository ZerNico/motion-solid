import {
    AnyResolvedKeyframe,
    MotionValue,
    transform,
    TransformOptions,
} from "motion-dom"
import { createMemo, untrack, type Accessor } from "solid-js"
import {
    access,
    isConstantObject,
    readOptions,
    type MaybeAccessor,
} from "../utils/access"
import { useConstant } from "../utils/use-constant"
import { useCombineMotionValues } from "./use-combine-values"
import { useComputed } from "./use-computed"

export type InputRange = number[]
type SingleTransformer<I, O> = (input: I) => O
type MultiTransformer<I, O> = (input: I[]) => O
type Transformer<I, O> =
    | SingleTransformer<I, O>
    /**
     * Ideally, this would be typed <I, O> in all instances, but to type this
     * more accurately requires the tuple support in TypeScript 4:
     * https://gist.github.com/InventingWithMonster/c4d23752a0fae7888596c4ff6d92733a
     */
    | MultiTransformer<AnyResolvedKeyframe, O>

interface OutputMap<O> {
    [key: string]: O[]
}

/**
 * Create multiple `MotionValue`s that transform the output of another `MotionValue` by mapping it from one range of values into multiple output ranges.
 *
 * @remarks
 *
 * This is useful when you want to derive multiple values from a single input value.
 * The keys of the output map must remain constant across renders.
 *
 * ```jsx
 * export const MyComponent = () => {
 *   const x = useMotionValue(0)
 *   const { opacity, scale } = useTransform(x, [0, 100], {
 *     opacity: [0, 1],
 *     scale: [0.5, 1]
 *   })
 *
 *   return (
 *     <motion.div style={{ opacity, scale, x }} />
 *   )
 * }
 * ```
 *
 * @param inputValue - `MotionValue`
 * @param inputRange - A linear series of numbers (either all increasing or decreasing)
 * @param outputMap - An object where keys map to output ranges. Each output range must be the same length as `inputRange`.
 * @param options - Transform options applied to all outputs
 *
 * @returns An object with the same keys as `outputMap`, where each value is a `MotionValue`
 *
 * @public
 */
export function useTransform<T extends Record<string, any[]>>(
    inputValue: MaybeAccessor<MotionValue<number>>,
    inputRange: MaybeAccessor<InputRange>,
    outputMap: MaybeAccessor<T>,
    options?: MaybeAccessor<TransformOptions<T[keyof T][number]>>
): { [K in keyof T]: MotionValue<T[K][number]> }

/**
 * Create a `MotionValue` that transforms the output of another `MotionValue` by mapping it from one range of values into another.
 *
 * @remarks
 *
 * Given an input range of `[-200, -100, 100, 200]` and an output range of
 * `[0, 1, 1, 0]`, the returned `MotionValue` will:
 *
 * - When provided a value between `-200` and `-100`, will return a value between `0` and  `1`.
 * - When provided a value between `-100` and `100`, will return `1`.
 * - When provided a value between `100` and `200`, will return a value between `1` and  `0`
 *
 *
 * The input range must be a linear series of numbers. The output range
 * can be any value type supported by Motion: numbers, colors, shadows, etc.
 *
 * Every value in the output range must be of the same type and in the same format.
 *
 * ```jsx
 * export const MyComponent = () => {
 *   const x = useMotionValue(0)
 *   const xRange = [-200, -100, 100, 200]
 *   const opacityRange = [0, 1, 1, 0]
 *   const opacity = useTransform(x, xRange, opacityRange)
 *
 *   return (
 *     <motion.div
 *       animate={{ x: 200 }}
 *       style={{ opacity, x }}
 *     />
 *   )
 * }
 * ```
 *
 * @param inputValue - `MotionValue`
 * @param inputRange - A linear series of numbers (either all increasing or decreasing)
 * @param outputRange - A series of numbers, colors or strings. Must be the same length as `inputRange`.
 * @param options -
 *
 *  - clamp: boolean. Clamp values to within the given range. Defaults to `true`
 *  - ease: EasingFunction[]. Easing functions to use on the interpolations between each value in the input and output ranges. If provided as an array, the array must be one item shorter than the input and output ranges, as the easings apply to the transition between each.
 *
 * @returns `MotionValue`
 *
 * @public
 */
export function useTransform<_I, O>(
    value: MaybeAccessor<MotionValue<number>>,
    inputRange: MaybeAccessor<InputRange>,
    outputRange: MaybeAccessor<O[]>,
    options?: MaybeAccessor<TransformOptions<O>>
): MotionValue<O>

/**
 * Create a `MotionValue` that transforms the output of another `MotionValue` through a function.
 * In this example, `y` will always be double `x`.
 *
 * ```jsx
 * export const MyComponent = () => {
 *   const x = useMotionValue(10)
 *   const y = useTransform(x, value => value * 2)
 *
 *   return <motion.div style={{ x, y }} />
 * }
 * ```
 *
 * @param input - A `MotionValue` that will pass its latest value through `transform` to update the returned `MotionValue`.
 * @param transform - A function that accepts the latest value from `input` and returns a new value.
 * @returns `MotionValue`
 *
 * @public
 */
export function useTransform<I, O>(
    input: MaybeAccessor<MotionValue<I>>,
    transformer: SingleTransformer<I, O>
): MotionValue<O>

/**
 * Pass an array of `MotionValue`s and a function to combine them. In this example, `z` will be the `x` multiplied by `y`.
 *
 * ```jsx
 * export const MyComponent = () => {
 *   const x = useMotionValue(0)
 *   const y = useMotionValue(0)
 *   const z = useTransform([x, y], ([latestX, latestY]) => latestX * latestY)
 *
 *   return <motion.div style={{ x, y, z }} />
 * }
 * ```
 *
 * @param input - An array of `MotionValue`s that will pass their latest values through `transform` to update the returned `MotionValue`.
 * @param transform - A function that accepts the latest values from `input` and returns a new value.
 * @returns `MotionValue`
 *
 * @public
 */
export function useTransform<I, O>(
    input: MaybeAccessor<
        | MotionValue<string>[]
        | MotionValue<number>[]
        | MotionValue<AnyResolvedKeyframe>[]
    >,
    transformer: MultiTransformer<I, O>
): MotionValue<O>
export function useTransform<_I, O>(transformer: () => O): MotionValue<O>

export function useTransform<I, O, K extends string>(
    input:
        | MaybeAccessor<
              | MotionValue<I>
              | MotionValue<string>[]
              | MotionValue<number>[]
              | MotionValue<AnyResolvedKeyframe>[]
          >
        | (() => O),
    inputRangeOrTransformer?: MaybeAccessor<InputRange> | Transformer<I, O>,
    outputRangeOrMap?: MaybeAccessor<O[] | OutputMap<O>>,
    options?: MaybeAccessor<TransformOptions<O>>
): MotionValue<O> | { [key in K]: MotionValue<O> } {
    if (typeof input === "function" && inputRangeOrTransformer === undefined) {
        return useComputed(input as () => O)
    }

    /**
     * Port note: with a range or transformer, a function `input` is an accessor of the input
     * value(s), so it can be re-pointed. Whether it's a list is read once.
     */
    const getInput = () =>
        access(input as MaybeAccessor<MotionValue<I> | MotionValue<I>[]>)
    const isList = Array.isArray(untrack(getInput))

    /**
     * Detect if outputRangeOrMap is an output map (object with keys)
     * rather than an output range (array).
     */
    const hasOutput = outputRangeOrMap !== undefined
    const isOutputMap =
        hasOutput && !Array.isArray(untrack(() => access(outputRangeOrMap)))

    if (isOutputMap) {
        return useMapTransform(
            getInput as Accessor<MotionValue<number>>,
            inputRangeOrTransformer as MaybeAccessor<InputRange>,
            outputRangeOrMap as MaybeAccessor<OutputMap<O>>,
            options
        ) as { [key in K]: MotionValue<O> }
    }

    /**
     * Port note: the ranges and options are read in a memo, so accessors of them (and options
     * with getters) rebuild the transformer when they change.
     */
    const transformer = createMemo(
        () =>
            hasOutput
                ? transform(
                      access(
                          inputRangeOrTransformer as MaybeAccessor<InputRange>
                      ),
                      access(outputRangeOrMap as MaybeAccessor<O[]>),
                      readOptions(options)
                  )
                : (inputRangeOrTransformer as Transformer<I, O>),
        {
            name:
                process.env.NODE_ENV !== "production"
                    ? "Motion.useTransform.transformer"
                    : undefined,
        }
    )

    const latest: any[] = []
    const result = useCombineMotionValues(
        () => {
            const value = getInput()
            return Array.isArray(value) ? value : [value]
        },
        () => {
            const value = getInput()
            const values = Array.isArray(value) ? value : [value]
            latest.length = 0
            for (let i = 0; i < values.length; i++) {
                latest[i] = values[i].get()
            }
            const transform = transformer() as any
            return (isList ? transform(latest) : transform(latest[0])) as O
        }
    )

    const inputAccelerate =
        typeof input !== "function" && !isList
            ? (input as MotionValue).accelerate
            : undefined

    /**
     * Port note: the accelerated keyframes are read once, so ranges and options that can change
     * (accessors, getters, stores) aren't accelerated.
     */
    if (
        inputAccelerate &&
        !inputAccelerate.isTransformed &&
        Array.isArray(inputRangeOrTransformer) &&
        isConstantObject(inputRangeOrTransformer) &&
        Array.isArray(outputRangeOrMap) &&
        isConstantObject(outputRangeOrMap) &&
        typeof options !== "function" &&
        !(options && !isConstantObject(options)) &&
        options?.clamp !== false
    ) {
        const ease = options?.ease

        /**
         * WAAPI fills missing 0 and 1 offsets with the underlying value, so
         * hold the end values to match the clamped transform.
         */
        result.accelerate = {
            ...inputAccelerate,
            times: [0, ...inputRangeOrTransformer, 1],
            keyframes: [
                outputRangeOrMap[0],
                ...outputRangeOrMap,
                outputRangeOrMap[outputRangeOrMap.length - 1],
            ],
            isTransformed: true,
            ...(ease
                ? { ease: Array.isArray(ease) ? [ease[0], ...ease] : ease }
                : {}),
        }
    }

    return result
}

function useMapTransform<O>(
    inputValue: Accessor<MotionValue<number>>,
    inputRange: MaybeAccessor<InputRange>,
    outputMap: MaybeAccessor<OutputMap<O>>,
    options?: MaybeAccessor<TransformOptions<O>>
): { [key: string]: MotionValue<O> } {
    /**
     * Capture keys once to ensure hooks are called in consistent order.
     */
    const keys = useConstant(() =>
        Object.keys(untrack(() => access(outputMap)))
    )
    const output = useConstant<{ [key: string]: MotionValue<O> }>(() => ({}))

    for (const key of keys) {
        output[key] = useTransform(
            inputValue,
            inputRange,
            () => access(outputMap)[key],
            options
        )
    }

    return output
}
