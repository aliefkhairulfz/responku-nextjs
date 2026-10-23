"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"

const PHRASES = ["untuk peneliti & responden", "untuk semua riset", "untuk riset yang lebih rapi", "untuk data yang bisa diandalkan"]

const INTERVAL_MS = 1800

export default function HeroTagline() {
    const reduceMotion = useReducedMotion()
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((current) => (current + 1) % PHRASES.length)
        }, INTERVAL_MS)

        return () => clearInterval(timer)
    }, [])

    const offset = reduceMotion ? 0 : 6

    return (
        <motion.p
            layout={!reduceMotion}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex items-center justify-center gap-1.5 font-mono text-sm font-medium tracking-normal text-muted-foreground"
        >
            <motion.span layout={!reduceMotion} className="shrink-0">
                Responku
            </motion.span>

            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={PHRASES[index]}
                    layout={!reduceMotion}
                    initial={{ opacity: 0, y: offset }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -offset }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="whitespace-nowrap"
                >
                    {PHRASES[index]}
                </motion.span>
            </AnimatePresence>
        </motion.p>
    )
}
