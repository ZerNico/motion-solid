import { isMotionValue } from "motion-dom"
import { $PROXY } from "solid-js"
import type { IsValidProp } from "../../../context/MotionConfigContext"
import type { MotionComponentBaseProps } from "../../../motion/types"
import { isValidMotionProp } from "../../../motion/utils/valid-prop"

function shouldForward(key: string, isValidProp?: IsValidProp) {
    return key.startsWith("on")
        ? !isValidMotionProp(key)
        : (isValidProp?.(key) ?? !isValidMotionProp(key))
}

/**
 * Props the motion component renders itself.
 */
const renderedByMotion = new Set(["children", "ref", "style"])

/**
 * Port note: upstream copies the forwarded props into a new object on every render. This returns
 * a reactive view of `props` instead (marked with Solid's `$PROXY`, so a JSX spread tracks its
 * keys), which forwards a key as long as it passes the same checks. `children`, `ref` and `style`
 * are rendered by the motion component itself.
 */
export function filterProps(
    props: MotionComponentBaseProps & Record<string, any>,
    isDom: boolean,
    forwardMotionProps: boolean,
    isValidProp?: IsValidProp
): Record<string, any> {
    const isForwarded = (key: string | symbol): key is string => {
        if (typeof key !== "string" || renderedByMotion.has(key)) return false

        /**
         * values is considered a valid prop by Emotion, so if it's present
         * this will be rendered out to the DOM unless explicitly filtered.
         *
         * We check the type as it could be used with the `feColorMatrix`
         * element, which we support.
         */
        if (key === "values" && typeof props.values === "object") return false

        if (isMotionValue(props[key])) return false

        return (
            shouldForward(key, isValidProp) ||
            (forwardMotionProps === true && isValidMotionProp(key)) ||
            (!isDom && !isValidMotionProp(key)) ||
            // If trying to use native HTML drag events, forward drag listeners
            (Boolean(props.draggable) && key.startsWith("onDrag"))
        )
    }

    return new Proxy(
        {},
        {
            get: (_target, key, receiver) => {
                if (key === $PROXY) return receiver
                return isForwarded(key) ? props[key] : undefined
            },
            has: (_target, key) =>
                key === $PROXY || (key in props && isForwarded(key)),
            ownKeys: () => Reflect.ownKeys(props).filter(isForwarded),
            getOwnPropertyDescriptor: (_target, key) =>
                isForwarded(key) && key in props
                    ? {
                          configurable: true,
                          enumerable: true,
                          get: () => props[key],
                      }
                    : undefined,
            set: () => false,
            defineProperty: () => false,
            deleteProperty: () => false,
        }
    )
}
