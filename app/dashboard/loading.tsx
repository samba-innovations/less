import s from './loading.module.css'

// Estado de carregamento instantâneo compartilhado por TODAS as rotas do
// dashboard (Next envolve o slot {children} do layout com este fallback).
// Aparece na hora em cada navegação enquanto o servidor busca os dados.
export default function DashboardLoading() {
  return (
    <div className={s.wrap} aria-busy="true" aria-label="carregando">
      <div className={s.header}>
        <div className={`${s.title} ${s.sk}`} />
        <div className={`${s.subtitle} ${s.sk}`} />
      </div>
      <div className={s.grid}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${s.card} ${s.sk}`} />)}
      </div>
      <div className={s.rows}>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className={`${s.row} ${s.sk}`} />)}
      </div>
    </div>
  )
}
