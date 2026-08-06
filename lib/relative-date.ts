// Data relativa em pt-BR: "hoje", "ontem", "há 3 dias", "há 2 meses", "há 1 ano".
export function relativeDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days < 0)   return d.toLocaleDateString('pt-BR')
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30)  return `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months < 12) return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(days / 365)
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`
}
