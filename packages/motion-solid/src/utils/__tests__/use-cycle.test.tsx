import { fireEvent } from "@testing-library/dom"
import { createEffect, flush } from "solid-js"
import { click, render } from "../../jest.setup"
import { useCycle } from "../use-cycle"

describe("useCycle", () => {
    test("cycles through given states", () => {
        const results: number[] = []

        const Component = () => {
            const [latest, cycle] = useCycle(1, 2, 3, 4)
            createEffect(latest, (latest) => {
                if (results[results.length - 1] !== latest) results.push(latest)
            })

            return <div onClick={() => cycle()} />
        }

        const { container } = render(() => <Component />)

        click(container.firstChild as Element)
        click(container.firstChild as Element)
        click(container.firstChild as Element)
        click(container.firstChild as Element)

        expect(results).toEqual([1, 2, 3, 4, 1])
    })

    test("jumps to a given index", () => {
        let result: number = 0

        const Component = () => {
            const [latest, cycle] = useCycle(1, 2, 3, 4)
            // Port note: upstream reads `latest` on every render.
            createEffect(latest, (latest) => {
                result = latest
            })
            return <div onClick={() => cycle(2)} />
        }

        const { container } = render(() => <Component />)
        fireEvent.click(container.firstChild as Element)
        // Port note: upstream's `fireEvent` is wrapped in `act()`.
        flush()

        expect(result).toBe(3)
    })

    test("is not functionally bound by the render cycle", () => {
        let result: number = 0

        const Component = () => {
            const [latest, cycle] = useCycle(1, 2, 3, 4)
            // Port note: upstream reads `latest` on every render.
            createEffect(latest, (latest) => {
                result = latest
            })
            return <div onClick={() => (cycle(), cycle())} />
        }

        const { container } = render(() => <Component />)
        fireEvent.click(container.firstChild as Element)
        // Port note: upstream's `fireEvent` is wrapped in `act()`.
        flush()

        expect(result).toBe(3)
    })
})

// initial index
// cycle(index)
