/**
 * The `jest` global of the tests ported from upstream is Vitest's `vi` (`upstream-setup.ts`).
 */
import type { MockInstance, vi } from "vitest"

declare global {
    const jest: typeof vi
    namespace jest {
        type SpyInstance<T extends (...args: any[]) => any = any> =
            MockInstance<T>
        type Mock<T extends (...args: any[]) => any = any> = MockInstance<T>
    }
}
