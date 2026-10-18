/**
 * Port of upstream's `cypress/integration/animate-style.ts` and its pages,
 * `dev/react/src/tests/animate-style.tsx`, `animate-style-complete.tsx`,
 * `animate-style-pause.tsx`, `animate-style-autoplay.tsx`, `animate-style-play.tsx`,
 * `animate-style-promise.tsx`, `animate-style-wildcard.tsx`, `animate-style-stagger.tsx` and
 * `animate-style-css-var.tsx`.
 */
import { onSettled } from "solid-js"
import { animateMini, stagger } from "../../src"
import { query, should, visit, wait } from "./utils"

const style = {
    width: "100px",
    height: "100px",
    "background-color": "#fff",
}

function AnimateStyle() {
    let ref!: HTMLDivElement

    onSettled(() => {
        const animation = animateMini(ref, { width: 200 }, { duration: 0.1 })

        return () => animation.cancel()
    })

    return (
        <div id="box" ref={ref} style={style}>
            test
        </div>
    )
}

function AnimateStyleComplete() {
    let ref!: HTMLDivElement

    onSettled(() => {
        const animation = animateMini(ref, { width: 200 }, { duration: 20 })

        animation.complete()

        return () => animation.cancel()
    })

    return <div id="box" ref={ref} style={style} />
}

function AnimateStylePause() {
    let ref!: HTMLDivElement

    onSettled(() => {
        const animation = animateMini(
            ref,
            { width: 200 },
            { duration: 1 } // Longer duration for CI timing reliability
        )

        const timeoutId = setTimeout(() => {
            animation.pause()
        }, 100)

        return () => {
            clearTimeout(timeoutId)
            animation.cancel()
        }
    })

    return <div id="box" ref={ref} style={style} />
}

function AnimateStyleAutoplay() {
    let ref!: HTMLDivElement

    onSettled(() => {
        const animation = animateMini(
            ref,
            { width: 200 },
            { duration: 0.1, autoplay: false }
        )

        return () => animation.cancel()
    })

    return <div id="box" ref={ref} style={style} />
}

function AnimateStylePlay() {
    let ref!: HTMLDivElement

    onSettled(() => {
        const animation = animateMini(ref, { width: 200 }, { duration: 0.1 })

        animation.pause()
        animation.play()

        return () => animation.cancel()
    })

    return <div id="box" ref={ref} style={style} />
}

function AnimateStylePromise() {
    let ref: HTMLDivElement | undefined

    onSettled(() => {
        const animation = animateMini(ref!, { width: 200 }, { duration: 0.1 })

        animation.then(() => {
            if (!ref) return
            ref.style.backgroundColor = "red"
        })

        return () => animation.cancel()
    })

    return <div id="box" ref={ref} style={style} />
}

function AnimateStyleWildcard() {
    let ref!: HTMLDivElement

    onSettled(() => {
        const animation = animateMini(
            ref,
            { width: [null, 200] },
            { duration: 0.1 }
        )

        return () => {
            animation.cancel()
        }
    })

    return (
        <div id="box" ref={ref} style={style}>
            content
        </div>
    )
}

function AnimateStyleStagger() {
    onSettled(() => {
        const controls = animateMini(
            "#box",
            { opacity: [0, 1] },
            { duration: 0.2, delay: stagger(0.5) }
        )

        return () => controls.stop()
    })

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                "flex-direction": "column",
                padding: "100px",
            }}
        >
            <div
                id="box"
                style={{
                    width: "100px",
                    height: "100px",
                    "background-color": "red",
                    opacity: 0,
                }}
            />
        </div>
    )
}

/**
 * Port note: upstream imports `animate` from `framer-motion/dom/mini`, which is `animateMini`.
 */
function AnimateStyleCssVar() {
    let ref!: HTMLDivElement

    onSettled(() => {
        try {
            CSS.registerProperty({
                name: "--x",
                syntax: "<length>",
                inherits: false,
                initialValue: "0px",
            })
        } catch (e) {
            // console.error(e)
        }

        const animation = animateMini(
            ref,
            { "--x": ["0px", "500px"] },
            { duration: 0.1 }
        )

        return () => {
            animation.cancel()
        }
    })

    return (
        <div
            id="box"
            ref={ref}
            style={{ ...style, left: "var(--x)", position: "relative" }}
        >
            content
        </div>
    )
}

describe("animateMini()", () => {
    it("correctly runs an animation", async () => {
        await visit(AnimateStyle)
        await wait(200)
        await should(() => {
            const element = query("#box")
            expect(element.getBoundingClientRect().width).toBe(200)
            expect(element.style.width).toBe("200px")
        })
    })

    it("complete() correctly finishes the animation", async () => {
        await visit(AnimateStyleComplete)
        await wait(200)
        await should(() => {
            const element = query("#box")
            expect(element.getBoundingClientRect().width).toBe(200)
            expect(element.style.width).toBe("200px")
        })
    })

    it("pause() correctly pauses the animation", async () => {
        await visit(AnimateStylePause)
        await wait(400)
        await should(() => {
            // Only check it's not at the final value - proves pause worked
            // Don't check lower bound as timing varies on CI
            expect(query("#box").getBoundingClientRect().width).toBeLessThan(
                200
            )
        })
    })

    it("autoplay correctly pauses the animation on creation", async () => {
        await visit(AnimateStyleAutoplay)
        await wait(200)
        await should(() => {
            const element = query("#box")
            expect(element.getBoundingClientRect().width).toBe(100)
            expect(element.style.width).toBe("100px")
        })
    })

    it("play correctly resumes the animation", async () => {
        await visit(AnimateStylePlay)
        await wait(200)
        await should(() => {
            const element = query("#box")
            expect(element.getBoundingClientRect().width).toBe(200)
            expect(element.style.width).toBe("200px")
        })
    })

    it("fires its promise on end", async () => {
        await visit(AnimateStylePromise)
        await wait(200)
        await should(() => {
            expect(query("#box").style.backgroundColor).toBe("red")
        })
    })

    it("correctly reads wildcard keyframes", async () => {
        await visit(AnimateStyleWildcard)
        await wait(200)
        await should(() => {
            const element = query("#box")
            expect(element.getBoundingClientRect().width).toBe(200)
            expect(element.style.width).toBe("200px")
        })
    })

    it("works correctly with stagger", async () => {
        await visit(AnimateStyleStagger)
        await wait(500)
        await should(() => {
            expect(query("#box").style.opacity).toBe("1")
        })
    })

    it("works correctly with CSS variables", async () => {
        await visit(AnimateStyleCssVar)
        await wait(500)
        await should(() => {
            const element = query("#box")
            expect(element.style.getPropertyValue("--x")).toBe("500px")
            expect(element.getBoundingClientRect().left).toBe(500)
        })
    })
})
