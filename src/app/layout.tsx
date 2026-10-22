import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toast"
import { cn } from "@/lib/cn"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const jakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-jakarta-sans",
})

export const metadata: Metadata = {
    title: "Responku",
    description: "Property of BukaWeb",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en" className={cn("light", "h-full", "antialiased", jakartaSans.variable, "font-sans", inter.variable)}>
            <body className="min-h-full flex flex-col">{children}</body>
            <Toaster />
        </html>
    )
}
