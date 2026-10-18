import { defineProject, mergeConfig } from "vitest/config"
import { createConfig } from "../../vitest.shared.mts"

/**
 * Tests ported from upstream (jsdom).
 */
export default mergeConfig(
    createConfig("upstream"),
    defineProject({ test: { name: "motion-solid" } })
)
