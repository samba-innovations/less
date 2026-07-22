import { PreferenciasClient } from './PreferenciasClient'

export const metadata = { title: 'preferências' }
export const dynamic  = 'force-dynamic'

export default function Page() {
  return <PreferenciasClient />
}
