import { Link, useLocation } from "@tanstack/solid-router"
import { createMemo, Show } from "solid-js"
import { pagePath, pages } from "../pages"

/**
 * Links to the previous and next page, in the order of the navigation.
 */
export function Pager() {
    const location = useLocation()
    const index = createMemo(() =>
        pages.findIndex((page) => pagePath(page) === location().pathname)
    )
    const previous = () => pages[index() - 1]
    const next = () => pages[index() + 1]

    return (
        <div class="mt-16 flex justify-between gap-4 border-t border-border pt-6 text-sm">
            <Show when={previous()} fallback={<span />}>
                {(page) => (
                    <Link
                        to={pagePath(page())}
                        class="text-fg-muted hover:text-fg"
                    >
                        ← {page().title}
                    </Link>
                )}
            </Show>
            <Show when={next()}>
                {(page) => (
                    <Link
                        to={pagePath(page())}
                        class="text-fg-muted hover:text-fg"
                    >
                        {page().title} →
                    </Link>
                )}
            </Show>
        </div>
    )
}
