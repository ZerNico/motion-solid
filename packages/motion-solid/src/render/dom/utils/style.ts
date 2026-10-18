import {
    camelToDash,
    getValueAsType,
    isCSSVariableName,
    numberValueTypes,
} from "motion-dom"
import type { ResolvedValues } from "../../types"

/**
 * Port note: Solid-only. Motion works with camelCase style keys (`backgroundColor`, `x`), Solid's
 * `style` binding with CSS property names (`setProperty("background-color", …)`) and string values.
 */

const dashToCamel = (str: string) =>
    str.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

/**
 * Converts the kebab-case keys of a `style` prop to camelCase, so Motion recognises them
 * (`"background-color"` → `backgroundColor`). CSS variables are kept as is.
 *
 * Always a copy: its values are read here, in the caller's tracking scope, so a store-backed
 * `style` (`style={store.style}`) is tracked, and an exiting component's frozen props keep
 * their values.
 */
export function normalizeStyleKeys<T extends Record<string, any>>(style: T): T {
    const normalized: Record<string, any> = {}
    for (const key of Object.keys(style)) {
        const isKebab = key.includes("-") && !isCSSVariableName(key)
        normalized[isKebab ? dashToCamel(key) : key] = style[key]
    }
    return normalized as T
}

/**
 * React's `isUnitlessNumber` (react-dom 19): numeric style values it renders without `px`.
 */
const unitlessNumbers = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
        " "
    )
)

/**
 * Converts a style object built by Motion (camelCase keys, numbers) to one for Solid's `style`
 * binding. Numbers get the unit React gives them: Motion's value type for the values Motion
 * knows (`rotate` in `deg`), otherwise `px` unless the property is unitless (`flexGrow`), like
 * React's `style`. Solid's `style` binding writes numbers as they are, which the browser drops
 * for properties that need a unit (`gap: 8`).
 */
export function toSolidStyle(style: ResolvedValues) {
    const solidStyle: Record<string, string> = {}

    for (const key in style) {
        const value = style[key]
        if (value === undefined || value === null) continue

        if (isCSSVariableName(key)) {
            solidStyle[key] = String(value)
            continue
        }

        // camelToDash("WebkitUserSelect") is "-webkit-user-select" already.
        const name = camelToDash(key)
        const valueType = numberValueTypes[key]
        if (valueType) {
            solidStyle[name] = String(getValueAsType(value, valueType))
        } else if (
            typeof value === "number" &&
            value !== 0 &&
            !unitlessNumbers.has(key)
        ) {
            solidStyle[name] = value + "px"
        } else {
            solidStyle[name] = String(value).trim()
        }
    }

    return solidStyle
}
