export const metadata = { title: 'considerações' }

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { canCreateAta, effectiveRole } from '@/lib/jwt'
import { ConsideracoesClient } from './ConsideracoesClient'

export default async function ConsideracoesPage() {
  const session = await getSession()
  if (!session) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  if (!canCreateAta(effectiveRole(session))) {
    redirect('/dashboard')
  }

  return <ConsideracoesClient />
}
