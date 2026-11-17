import Image from 'next/image'
import Link from 'next/link'

export function WorkspaceBrand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
      <Image src="/dog.png" alt="" width={36} height={36} unoptimized className="rounded-xl" />
      Resume Copilot
    </Link>
  )
}
