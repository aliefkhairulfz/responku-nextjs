import WalletBalancePage from "@/components/dashboard/main-column/wallet-balance-page"
import { env } from "@/env"

export default function Page() {
    return <WalletBalancePage tokenPriceIdr={env.TOKEN_PRICE_IDR} />
}
