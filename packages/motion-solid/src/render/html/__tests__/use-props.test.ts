import { renderHook } from "@solidjs/testing-library"
import { motionValue } from "motion-dom"
import { createMemo, createSignal, flush } from "solid-js"
import { createHTMLProps } from "../use-props"

/**
 * Port note: upstream's `useHTMLProps(props, visualState)` hook is `createHTMLProps(props,
 * visualState)(props)` here (built once for the visual state, then called with the current props).
 * The returned `style` is in the form of Solid's `style` binding: CSS property names
 * (`user-select`, `-webkit-user-select`) instead of React's camelCase keys.
 */
const useHTMLProps = (props: any, visualState: any) =>
    createHTMLProps(props, visualState)(props)

describe("HTML useProps", () => {
    test("should return correct styles for element", () => {
        const { result } = renderHook(() =>
            useHTMLProps(
                {
                    style: {
                        x: motionValue(1),
                        y: motionValue(2),
                    },
                },
                {
                    x: 3,
                }
            )
        )

        expect(result).toEqual({
            style: {
                transform: "translateX(3px)",
            },
        })
    })

    test("should disable hardware acceleration in isStatic mode", () => {
        const { result } = renderHook(() =>
            useHTMLProps(
                {
                    style: {
                        x: motionValue(1),
                        y: motionValue(2),
                    },
                },
                {
                    x: 3,
                }
            )
        )

        expect(result).toEqual({
            style: {
                transform: "translateX(3px)",
            },
        })
    })

    test("should generate new styles when a new visualState object is passed", () => {
        const initialState = { x: 100 } as any

        /**
         * Port note: React's `rerender` with new props becomes a signal; the props are
         * rebuilt when the visual state object changes, like upstream's memo on it.
         */
        const [state, setState] = createSignal<any>(initialState)
        const { result } = renderHook(() => {
            const props = createMemo(() => useHTMLProps({}, state()))
            return {
                get current() {
                    return props()
                },
            }
        })

        const a = result.current.style
        setState(initialState)
        flush()
        const b = result.current.style
        setState({ x: 200 })
        flush()
        const c = result.current.style

        expect(a).toEqual(b)
        expect(a).not.toEqual(c)
        expect(a).toEqual({
            transform: "translateX(100px)",
        })
        expect(c).toEqual({
            transform: "translateX(200px)",
        })
    })

    test("should generate the correct props when drag is enabled", () => {
        const { result } = renderHook(() =>
            useHTMLProps({ drag: true }, { x: 3 })
        )

        expect(result).toEqual({
            // Port note: a string, Solid removes attributes set to `false`.
            draggable: "false",
            style: {
                transform: "translateX(3px)",
                "user-select": "none",
                "-webkit-user-select": "none",
                "-webkit-touch-callout": "none",
                "touch-action": "none",
            },
        })

        const { result: resultX } = renderHook(() =>
            useHTMLProps({ drag: "x" }, { x: 3 })
        )

        expect(resultX).toEqual({
            // Port note: a string, Solid removes attributes set to `false`.
            draggable: "false",
            style: {
                transform: "translateX(3px)",
                "user-select": "none",
                "-webkit-user-select": "none",
                "-webkit-touch-callout": "none",
                "touch-action": "pan-y",
            },
        })

        const { result: resultY } = renderHook(() =>
            useHTMLProps({ drag: "y" }, { x: 3 })
        )

        expect(resultY).toEqual({
            // Port note: a string, Solid removes attributes set to `false`.
            draggable: "false",
            style: {
                transform: "translateX(3px)",
                "user-select": "none",
                "-webkit-user-select": "none",
                "-webkit-touch-callout": "none",
                "touch-action": "pan-x",
            },
        })
    })
})
