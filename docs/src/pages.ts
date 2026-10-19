export interface Page {
    /**
     * The page's file in `src/content` (without `.mdx`) and its route under `/docs/`.
     */
    slug: string
    title: string
    description: string
}

export interface Section {
    title: string
    pages: Page[]
}

/**
 * The pages, in the order of the navigation. After adding one, run `pnpm routes` to generate its
 * route.
 */
export const sections: Section[] = [
    {
        title: "Get started",
        pages: [
            {
                slug: "introduction",
                title: "Introduction",
                description:
                    "What motion-solid is, and a first look at animating Solid components.",
            },
            {
                slug: "installation",
                title: "Installation",
                description:
                    "Install motion-solid with Solid 2 and set up the compiler.",
            },
            {
                slug: "coming-from-react",
                title: "Coming from React",
                description:
                    "How motion-solid's API differs from Motion for React, and why.",
            },
        ],
    },
    {
        title: "Animation",
        pages: [
            {
                slug: "animation",
                title: "Animation",
                description:
                    "Animate with initial, animate and exit, keyframes, variants and their propagation.",
            },
            {
                slug: "transitions",
                title: "Transitions",
                description:
                    "Control how values animate: tweens, springs, inertia, delays, staggering and repeats.",
            },
            {
                slug: "gestures",
                title: "Gestures",
                description:
                    "Hover, tap, focus, pan and in-view gestures, and the animations they trigger.",
            },
            {
                slug: "drag",
                title: "Drag",
                description:
                    "Make elements draggable, with constraints, elasticity, momentum and drag controls.",
            },
            {
                slug: "scroll-animations",
                title: "Scroll animations",
                description:
                    "Trigger animations when elements enter the viewport, or link them to scroll progress.",
            },
            {
                slug: "layout-animations",
                title: "Layout animations",
                description:
                    "Animate changes of size and position, and shared elements between components.",
            },
            {
                slug: "svg-animations",
                title: "SVG animations",
                description:
                    "Animate SVG attributes, draw paths with pathLength, and morph shapes.",
            },
            {
                slug: "motion-values",
                title: "Motion values",
                description:
                    "Values that update elements every frame without Solid, and how they meet Solid's reactivity.",
            },
        ],
    },
    {
        title: "Components",
        pages: [
            {
                slug: "motion",
                title: "motion",
                description:
                    "The motion components: every HTML and SVG element, and your own components with motion.create.",
            },
            {
                slug: "animate-presence",
                title: "AnimatePresence",
                description:
                    "Animate components as they're removed, with presence-aware Show and For.",
            },
            {
                slug: "layout-group",
                title: "LayoutGroup",
                description:
                    "Group components whose layout animations affect each other, and namespace layoutIds.",
            },
            {
                slug: "lazy-motion",
                title: "LazyMotion",
                description:
                    "Load animation features on demand with LazyMotion and the m component.",
            },
            {
                slug: "motion-config",
                title: "MotionConfig",
                description:
                    "Set default transitions, reduced motion and other options for every motion component inside it.",
            },
            {
                slug: "reorder",
                title: "Reorder",
                description:
                    "Drag-to-reorder lists with Reorder.Group and Reorder.Item.",
            },
        ],
    },
    {
        title: "Hooks",
        pages: [
            {
                slug: "use-animate",
                title: "useAnimate",
                description:
                    "Animate elements imperatively, with scoped selectors, sequences and playback controls.",
            },
            {
                slug: "use-animation-frame",
                title: "useAnimationFrame",
                description: "Run a callback on every animation frame.",
            },
            {
                slug: "use-drag-controls",
                title: "useDragControls",
                description: "Start a drag from another element.",
            },
            {
                slug: "use-in-view",
                title: "useInView",
                description:
                    "An accessor of whether an element is in the viewport.",
            },
            {
                slug: "use-motion-value-event",
                title: "useMotionValueEvent",
                description:
                    "Subscribe to a motion value's changes and animation events, or read it as an accessor.",
            },
            {
                slug: "use-reduced-motion",
                title: "useReducedMotion",
                description:
                    "An accessor of whether the device prefers reduced motion.",
            },
            {
                slug: "use-scroll",
                title: "useScroll",
                description:
                    "Motion values of the scroll position and progress of the page, an element or a target.",
            },
            {
                slug: "use-spring",
                title: "useSpring",
                description:
                    "A motion value that follows another value, or a signal, with a spring.",
            },
            {
                slug: "use-time",
                title: "useTime",
                description:
                    "A motion value of the time since it was created, for perpetual animations.",
            },
            {
                slug: "use-transform",
                title: "useTransform",
                description:
                    "Derive motion values by mapping ranges or computing them from other values and signals.",
            },
            {
                slug: "use-velocity",
                title: "useVelocity",
                description:
                    "A motion value of another motion value's velocity.",
            },
            {
                slug: "use-motion-template",
                title: "useMotionTemplate",
                description:
                    "Combine motion values into a string with a template literal.",
            },
            {
                slug: "other-hooks",
                title: "Other hooks",
                description:
                    "useCycle, usePageInView, useAnimationControls, useDomEvent and other utilities.",
            },
        ],
    },
    {
        title: "Guides",
        pages: [
            {
                slug: "animate-function",
                title: "animate()",
                description:
                    "Animate elements, values and objects outside components, with timeline sequences.",
            },
            {
                slug: "bundle-size",
                title: "Reduce bundle size",
                description:
                    "Keep motion-solid small with LazyMotion, m, feature bundles and the mini entries.",
            },
            {
                slug: "accessibility",
                title: "Accessibility",
                description:
                    "Respect reduced motion preferences and keep animated interfaces accessible.",
            },
            {
                slug: "ssr",
                title: "Server-side rendering",
                description:
                    "Render motion components on the server, hydrate them and start appear animations early.",
            },
        ],
    },
]

export const pages = sections.flatMap((section) => section.pages)

export const pagePath = (page: Page) => `/docs/${page.slug}`

/**
 * The `head` of a docs route, from its entry above.
 */
export function pageHead(slug: string) {
    const page = pages.find((page) => page.slug === slug)
    if (!page) throw new Error(`No page "${slug}" in pages.ts`)
    return () => ({
        meta: [
            { title: `${page.title} · motion-solid` },
            { name: "description", content: page.description },
        ],
    })
}
