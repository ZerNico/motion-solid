import { motion } from "../.."
import { render } from "../../jest.setup"

describe("SVG path", () => {
    test("accepts custom transition prop", async () => {
        const element = await new Promise((resolve) => {
            let ref: SVGRectElement | undefined
            const Component = () => (
                <motion.rect
                    ref={(el: SVGRectElement) => (ref = el)}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.01 }}
                    onAnimationComplete={() => resolve(ref)}
                />
            )
            // Port note: upstream's identical-props rerender is a no-op in Solid.
            render(() => <Component />)
        })

        expect(element).toHaveAttribute("stroke-dashoffset", "0")
        expect(element).toHaveAttribute("stroke-dasharray", "1 1")
        expect(element).toHaveAttribute("pathLength", "1")
    })
})
