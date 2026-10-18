import type { Component } from "solid-js"
import { lowercaseSVGElements } from "../../svg/lowercase-elements"

export function isSVGComponent(Component: string | Component<any>) {
    if (
        /**
         * If it's not a string, it's a custom component. Currently we only support
         * HTML custom components.
         */
        typeof Component !== "string" ||
        /**
         * If it contains a dash, the element is a custom HTML webcomponent.
         */
        Component.includes("-")
    ) {
        return false
    } else if (
        /**
         * If it's in our list of lowercase SVG tags, it's an SVG component
         */
        lowercaseSVGElements.indexOf(Component) > -1 ||
        /**
         * If it contains a capital letter, it's an SVG component
         */
        /[A-Z]/u.test(Component)
    ) {
        return true
    }

    return false
}
