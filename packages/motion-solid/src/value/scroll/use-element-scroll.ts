import { warnOnce } from "motion-utils"
import type { ElementRef } from "../../utils/refs"
import { useScroll } from "../use-scroll"

/**
 * @deprecated useElementScroll is deprecated. Convert to useScroll({ container: ref })
 */
export function useElementScroll(ref: ElementRef<HTMLElement>) {
    if (process.env.NODE_ENV === "development") {
        warnOnce(
            false,
            "useElementScroll is deprecated. Convert to useScroll({ container: ref })."
        )
    }

    return useScroll({ container: ref })
}
