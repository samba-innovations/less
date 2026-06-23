import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isManager, effectiveRole } from '@/lib/jwt'
import { DOC_TYPES, type DocType } from '@/lib/doc-types'
import { NovoClient } from './NovoClient'

export default async function NovoPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const session = await getSession()
  if (!session) redirect(process.env.NEXT_PUBLIC_SSO_URL + '/login')

  const { type } = await searchParams
  const preType = type && type in DOC_TYPES ? type as DocType : undefined

  return (
    <NovoClient isManager={isManager(effectiveRole(session))} preType={preType} />
  )
}
