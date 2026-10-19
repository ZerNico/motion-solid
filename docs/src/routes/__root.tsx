import {
    createRootRoute,
    HeadContent,
    Outlet,
    Scripts,
} from "@tanstack/solid-router"
import styles from "../styles.css?url"

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            { title: "motion-solid" },
        ],
        links: [
            { rel: "stylesheet", href: styles },
            { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        ],
    }),
    component: () => (
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <HeadContent />
            </head>
            <body>
                <Outlet />
                <Scripts />
            </body>
        </html>
    ),
})
