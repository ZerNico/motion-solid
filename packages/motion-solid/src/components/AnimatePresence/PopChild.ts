import type { AnimatePresenceProps } from "./types"

interface Size {
    width: number
    height: number
    top: number
    left: number
    right: number
    bottom: number
    direction: string
}

export interface PoppedChild {
    /**
     * Takes the child out of the layout, at the position it was measured.
     */
    pop: (
        props: Pick<AnimatePresenceProps, "anchorX" | "anchorY" | "root">,
        nonce?: string
    ) => void
    /**
     * Puts the child back into the layout.
     */
    restore: VoidFunction
}

let id = 0

/**
 * Port note: upstream's `PopChild` component measures its child in `getSnapshotBeforeUpdate` when
 * it stops being present, then applies the measured size and position in an insertion effect.
 * Here `AnimatePresence` measures the exiting child before it writes the new children to the
 * DOM (`popChild`), and pops it out once they're written (`pop`).
 */
export function popChild(element: HTMLElement): PoppedChild {
    const size: Size = {
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        direction: "ltr",
    }

    const parent = element.offsetParent
    const parentWidth =
        parent instanceof HTMLElement ? parent.offsetWidth || 0 : 0
    const parentHeight =
        parent instanceof HTMLElement ? parent.offsetHeight || 0 : 0

    const computedStyle = getComputedStyle(element)
    size.height = parseFloat(computedStyle.height)
    size.width = parseFloat(computedStyle.width)
    size.top = element.offsetTop
    size.left = element.offsetLeft
    size.right = parentWidth - size.width - size.left
    size.bottom = parentHeight - size.height - size.top
    size.direction = computedStyle.direction

    let restore: VoidFunction | undefined

    return {
        pop({ anchorX = "left", anchorY = "top", root }, nonce) {
            const { width, height, top, left, right, bottom, direction } = size
            if (!width || !height || restore) return

            const popId = `motion-pop-${id++}`

            const isRTL = direction === "rtl"
            const x =
                anchorX === "left"
                    ? isRTL
                        ? `right: ${right}`
                        : `left: ${left}`
                    : isRTL
                      ? `left: ${left}`
                      : `right: ${right}`
            const y = anchorY === "bottom" ? `bottom: ${bottom}` : `top: ${top}`

            element.dataset.motionPopId = popId

            /**
             * We create and inject a style block so we can apply this explicit
             * sizing in a non-destructive manner by just deleting the style block.
             */
            const style = document.createElement("style")
            if (nonce) style.nonce = nonce

            const styleParent = root ?? document.head
            styleParent.appendChild(style)

            if (style.sheet) {
                style.sheet.insertRule(`
          [data-motion-pop-id="${popId}"] {
            position: absolute !important;
            width: ${width}px !important;
            height: ${height}px !important;
            ${x}px !important;
            ${y}px !important;
          }
        `)
            }

            restore = () => {
                element.removeAttribute("data-motion-pop-id")
                if (styleParent.contains(style)) {
                    styleParent.removeChild(style)
                }
            }
        },
        restore() {
            restore?.()
            restore = undefined
        },
    }
}
