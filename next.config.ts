import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    /* config options here */
    cacheComponents: true,
    partialPrefetching: true,
    images: {
        // Placeholder founder portraits. Drop this entry once real photos are in `public/`.
        remotePatterns: [{ protocol: "https", hostname: "i.pravatar.cc" }],
    },
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
}

export default nextConfig
