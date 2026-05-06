import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const payload = await getSession()
  if (!payload) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const user = await db.user.findUnique({
    where:  { id: payload.userId },
    select: { name: true, avatarUrl: true },
  })
  if (!user) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  return (
    <DashboardShell payload={payload} user={user}>
      {children}
    </DashboardShell>
  )
}
