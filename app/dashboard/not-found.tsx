import Link from 'next/link'
import { Compass, Home } from 'lucide-react'
import s from './not-found.module.css'

// not-found.tsx — página custom que aparece quando rota não existe.
// Cai aqui via next automático. Substitui a página branca padrão.
export default function NotFound() {
  return (
    <div className={s.wrap}>
      <div className={s.iconWrap}>
        <Compass size={40} strokeWidth={1.2}/>
      </div>
      <div className={s.textBlock}>
        <h1 className={s.title}>página não encontrada</h1>
        <p className={s.description}>
          essa rota não existe ou foi movida. verifica o link que você usou
          ou volta pro início.
        </p>
      </div>
      <div className={s.actions}>
        <Link href="/dashboard" className="samba-btn-primary">
          <Home size={14}/> voltar pro início
        </Link>
      </div>
      <span className={s.code}>404</span>
    </div>
  )
}
