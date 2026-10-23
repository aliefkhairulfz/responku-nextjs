'use client'

import { useCallback, useEffect, useState } from 'react'
import BasicStatisticsCard from '@/components/shared/basic-statistics-card'
import { getJson } from '@/lib/api-client'
import { useRefreshOnFocus } from '@/lib/use-refresh-on-focus'

/**
 * The caller's token balance, as one of the dashboard's statistic cards.
 *
 * Self-contained on purpose: the balance belongs to the account, not to whichever side of the
 * app is on screen. So the same card renders in researcher and respondent mode, and it does
 * not depend on that mode's own read succeeding — a respondent-only account in researcher
 * mode still sees its balance, where a card fed by the research list would have shown "—".
 *
 * The read is repeated when the page comes back into view, because a reward is credited by an
 * admin from another session.
 */
export default function TokenBalanceCard() {
    const [balance, setBalance] = useState<number | null>(null)

    /** The balance, or `null` when the wallet could not be read. */
    const read = useCallback(async () => {
        const result = await getJson<{ wallet: { balance: number } }>('/api/payment/wallet')

        return result.ok && result.data !== null ? result.data.wallet.balance : null
    }, [])

    useEffect(() => {
        let cancelled = false

        void read().then((next) => {
            if (!cancelled) setBalance(next)
        })

        return () => {
            cancelled = true
        }
    }, [read])

    // A failed background read leaves the last known balance up rather than blanking the card.
    const refresh = useCallback(() => {
        void read().then((next) => {
            if (next !== null) setBalance(next)
        })
    }, [read])

    useRefreshOnFocus(refresh)

    return (
        <BasicStatisticsCard
            title="Saldo Token"
            statsNumber={balance === null ? '—' : balance.toLocaleString('id-ID')}
            footerTextContent="token tersedia"
        />
    )
}
