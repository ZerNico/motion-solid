import { defineProject, mergeConfig } from "vitest/config"
import { createConfig } from "../../vitest.shared.mts"

/**
 * Our own tests, in a real browser (layout, WAAPI).
 */
export default mergeConfig(
    createConfig("browser"),
    defineProject({ test: { name: "motion-solid-browser" } })
)
