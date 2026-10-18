import { renderHook } from "@solidjs/testing-library"
import { motionValue } from "motion-dom"
import { createSVGProps } from "../use-props"

/**
 * Port note: upstream's `useSVGProps(props, visualState, isStatic, Component)` hook is
 * `createSVGProps(props, visualState, Component)(props)` here (there's no `isStatic` argument).
 * Attributes and `style` are in the form Solid sets them: DOM attribute names
 * (`stroke-dasharray`) and CSS property names (`transform-box`), like motion-dom's `renderSVG`.
 */
const useSVGProps = (
    props: any,
    visualState: any,
    _isStatic: boolean,
    Component: string
) => createSVGProps(props, visualState, Component)(props)

describe("SVG useProps", () => {
    test("should return correct styles for element", () => {
        const { result } = renderHook(() =>
            useSVGProps(
                {
                    attrX: 1,
                    attrY: motionValue(5),
                    attrScale: 3,
                    cx: 2,
                    style: {
                        x: 3,
                        scale: 4,
                    },
                } as any,
                {
                    attrX: 6,
                    attrY: 10,
                    attrScale: 4,
                    cx: 7,
                    x: 8,
                    scale: 9,
                },
                false,
                "path"
            )
        )

        expect(result).toStrictEqual({
            x: 6,
            y: 10,
            scale: 4,
            cx: 7,
            style: {
                transform: "translateX(8px) scale(9)",
                "transform-box": "fill-box",
                "transform-origin": "50% 50%",
            },
        })
    })

    test("should return correct styles for element with pathLength", () => {
        const { result } = renderHook(() =>
            useSVGProps(
                { style: {} } as any,
                {
                    pathLength: 0.5,
                },
                false,
                "path"
            )
        )

        // Uses unitless values to avoid Safari zoom bug
        expect(result).toStrictEqual({
            pathLength: 1,
            "stroke-dasharray": "0.5 1",
            "stroke-dashoffset": "0",
            style: {},
        })
    })

    test("should correctly remove props as motionvalues", () => {
        const { result } = renderHook(() =>
            useSVGProps(
                { y: motionValue(2) } as any,
                { attrY: 3 },
                false,
                "path"
            )
        )

        expect(result).toStrictEqual({
            y: 3,
            style: {},
        })
    })

    test("should keep offsetDistance as CSS style, not SVG attribute", () => {
        const { result } = renderHook(() =>
            useSVGProps(
                { style: {} } as any,
                {
                    offsetDistance: "50%",
                    offsetPath: "path('M 0 0 L 100 100')",
                },
                false,
                "circle"
            )
        )

        expect(result).toStrictEqual({
            style: {
                "offset-distance": "50%",
                "offset-path": "path('M 0 0 L 100 100')",
            },
        })
    })

    test("should keep all CSS motion path properties as styles", () => {
        const { result } = renderHook(() =>
            useSVGProps(
                { style: {} } as any,
                {
                    offsetDistance: "25%",
                    offsetPath: "path('M 0 0 L 100 100')",
                    offsetRotate: "auto",
                    offsetAnchor: "center",
                },
                false,
                "rect"
            )
        )

        expect(result).toStrictEqual({
            style: {
                "offset-distance": "25%",
                "offset-path": "path('M 0 0 L 100 100')",
                "offset-rotate": "auto",
                "offset-anchor": "center",
            },
        })
    })
})
