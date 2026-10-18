import type { JSX } from "@solidjs/web"
import type { Box, Point } from "motion-utils"
import type { HTMLElements } from "../../render/html/supported-elements"

export type ReorderAxis = "x" | "y" | "xy"

export interface ReorderContextProps<T> {
    readonly axis: ReorderAxis
    registerItem: (item: T, layout: Box) => void
    updateOrder: (item: T, offset: Point, velocity: Point) => void
    groupRef: { current: Element | null }
}

export interface ItemData<T> {
    value: T
    layout: Box
}

// Reorder component type helpers
export type ReorderElementTag = keyof HTMLElements & keyof JSX.IntrinsicElements

// Default elements for each component
export type DefaultGroupElement = "ul"

export type DefaultItemElement = "li"
