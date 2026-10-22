"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/cn"

/** Digits in a verification code. */
export const OTP_LENGTH = 6

/** Stable keys for the cells — the boxes never reorder, only their content changes. */
const CELL_KEYS = Array.from({ length: OTP_LENGTH }, (_, index) => `otp-cell-${index}`)

/**
 * Six boxes driven by one real `<input>`.
 *
 * Keeping a native control behind the boxes means pasting a code, the mobile
 * keyboard's `one-time-code` autofill, and screen readers all keep working,
 * instead of six hand-rolled inputs having to reimplement them.
 */
export function OtpInput({ id, value, onChange, invalid }: { id: string; value: string; onChange: (next: string) => void; invalid: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [focused, setFocused] = useState(false)

    // The code is the only thing worth typing wherever this appears.
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const activeIndex = Math.min(value.length, OTP_LENGTH - 1)

    return (
        <div className="relative">
            <input
                ref={inputRef}
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-invalid={invalid}
                className="absolute inset-0 size-full cursor-text opacity-0 outline-none"
            />

            <div aria-hidden className="flex gap-2">
                {CELL_KEYS.map((key, index) => (
                    <div
                        key={key}
                        className={cn(
                            "flex h-12 flex-1 items-center justify-center rounded-md border border-input bg-transparent text-lg font-semibold shadow-xs transition-colors",
                            invalid && "border-destructive",
                            focused && !invalid && index === activeIndex && "border-ring ring-3 ring-ring/50",
                        )}
                    >
                        {value[index] ?? ""}
                    </div>
                ))}
            </div>
        </div>
    )
}
