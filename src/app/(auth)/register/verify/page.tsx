import { Suspense } from "react"
import { VerifyForm } from "./verify-form"

/**
 * Where registration lands: the screen that turns the emailed 6-digit code into a
 * verified account.
 *
 * It is a server component only to read `searchParams`, which under Cache
 * Components has to be awaited inside a `<Suspense>` boundary. The promise is
 * passed down rather than awaited here so the shell can still be prerendered.
 */

type VerifySearchParams = Promise<{ email?: string; sent?: string }>

export default function VerifyEmailPage({ searchParams }: { searchParams: VerifySearchParams }) {
    return (
        <Suspense fallback={<VerifyFallback />}>
            <VerifyEmailContent searchParams={searchParams} />
        </Suspense>
    )
}

async function VerifyEmailContent({ searchParams }: { searchParams: VerifySearchParams }) {
    const { email, sent } = await searchParams

    // `sent` is absent when the page is opened some other way than right after
    // registering, which is the one case where a code is not known to have just gone out.
    return <VerifyForm initialEmail={email?.trim() ?? ""} codeSent={sent === undefined ? undefined : sent !== "0"} />
}

/** Mirrors the form's own header and fields, so the swap does not shift the layout. */
function VerifyFallback() {
    return (
        <div aria-hidden className="space-y-8">
            <div className="space-y-2">
                <div className="h-8 w-48 rounded bg-muted" />
                <div className="h-5 w-full rounded bg-muted" />
            </div>

            <div className="space-y-4">
                <div className="h-5 w-32 rounded bg-muted" />
                <div className="h-12 w-full rounded bg-muted" />
                <div className="h-9 w-full rounded bg-muted" />
            </div>
        </div>
    )
}
