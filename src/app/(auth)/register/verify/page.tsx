import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

function VerifyFallback() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <div className="h-6 w-40 rounded bg-muted" />
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-12 w-full rounded bg-muted" />
                <div className="h-9 w-full rounded bg-muted" />
            </CardContent>
        </Card>
    )
}
