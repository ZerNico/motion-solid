import { createFileRoute, Outlet } from "@tanstack/solid-router"
import { Header } from "../components/Header"
import { SideNav } from "../components/SideNav"

export const Route = createFileRoute("/docs")({
    component: () => (
        <>
            <Header />
            <div class="mx-auto flex max-w-7xl gap-10 px-6">
                <SideNav />
                <Outlet />
            </div>
        </>
    ),
})
