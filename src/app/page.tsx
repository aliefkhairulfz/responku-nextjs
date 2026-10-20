import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Page() {
    return (
        <div className="container w-full">
            <h1>Home</h1>
            <Button>Hello World</Button>
            <Input placeholder="Enter your name please" />
            <Link href="/about">About</Link>
        </div>
    )
}
