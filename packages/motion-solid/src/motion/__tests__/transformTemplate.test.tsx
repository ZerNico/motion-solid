import { frame } from "motion-dom"
import { createSignal, flush } from "solid-js"
import { motion } from "../../"
import { nextMicrotask } from "../../gestures/__tests__/utils"
import { render } from "../../jest.setup"

describe("transformTemplate", () => {
    it("applies transformTemplate on initial render", () => {
        const { container } = render(() => (
            <motion.div
                initial={{ x: 10 }}
                transformTemplate={({ x }, generated) =>
                    `translateY(${x}) ${generated}`
                }
            />
        ))
        expect(container.firstChild).toHaveStyle(
            "transform: translateY(10px) translateX(10px)"
        )
    })

    it("applies updated transformTemplate", async () => {
        const [updated, setUpdated] = createSignal(false)
        const { container } = render(() => (
            <motion.div
                initial={{ x: 10 }}
                transformTemplate={
                    !updated()
                        ? ({ x }, generated) => `translateY(${x}) ${generated}`
                        : ({ x }, generated) => {
                              const newX =
                                  typeof x === "string" ? parseFloat(x) : x
                              return `translateY(${
                                  (newX as number) * 2
                              }px) ${generated}`
                          }
                }
            />
        ))
        expect(container.firstChild).toHaveStyle(
            "transform: translateY(10px) translateX(10px)"
        )

        setUpdated(true)
        flush()

        await nextMicrotask()
        expect(container.firstChild).toHaveStyle(
            "transform: translateY(20px) translateX(10px)"
        )
    })

    it("renders transform with transformTemplate", () => {
        const { container } = render(() => (
            <motion.div
                transformTemplate={(_, generated) =>
                    `translateY(20px) ${generated}`
                }
                style={{ x: 10 }}
            />
        ))
        expect(container.firstChild).toHaveStyle(
            "transform: translateY(20px) translateX(10px)"
        )
    })

    it("renders transformTemplate without any transform", () => {
        const { container } = render(() => (
            <motion.div transformTemplate={() => `translateY(20px)`} />
        ))
        expect(container.firstChild).toHaveStyle("transform: translateY(20px)")
    })

    it("removes transformTemplate if prop is removed and transform is changed", async () => {
        const [hasTemplate, setHasTemplate] = createSignal(true)
        const [x, setX] = createSignal(10)
        const { container } = render(() => (
            <motion.div
                transformTemplate={
                    hasTemplate() ? () => `translateY(20px)` : undefined
                }
                style={{ x: x() }}
            />
        ))
        expect(container.firstChild).toHaveStyle("transform: translateY(20px)")

        setHasTemplate(false)
        setX(20)
        flush()

        await new Promise((resolve) => frame.postRender(resolve))

        expect(container.firstChild).toHaveStyle("transform: translateX(20px)")
    })

    it("removes transformTemplate if prop is removed and transform is not changed", async () => {
        const [hasTemplate, setHasTemplate] = createSignal(true)
        const { container } = render(() => (
            <motion.div
                transformTemplate={
                    hasTemplate() ? () => `translateY(20px)` : undefined
                }
                style={{ x: 10 }}
            />
        ))
        expect(container.firstChild).toHaveStyle("transform: translateY(20px)")
        setHasTemplate(false)
        flush()

        await new Promise((resolve) => frame.postRender(resolve))

        expect(container.firstChild).toHaveStyle("transform: translateX(10px)")
    })

    it("removes transformTemplate if prop is removed", async () => {
        const [hasTemplate, setHasTemplate] = createSignal(true)
        const { container } = render(() => (
            <motion.div
                transformTemplate={
                    hasTemplate() ? () => `translateY(20px)` : undefined
                }
            />
        ))
        await nextMicrotask()
        expect(container.firstChild).toHaveStyle("transform: translateY(20px)")
        setHasTemplate(false)
        flush()

        await new Promise((resolve) => frame.postRender(resolve))

        expect(container.firstChild).toHaveStyle("transform: none")
    })
})
