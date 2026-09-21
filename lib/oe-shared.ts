// Puro e client-safe (sem imports de servidor) — pode ser usado no cliente e no
// servidor. Deriva o "tipo" OE ('lp'/'mat') a partir do NOME da disciplina,
// porque o currículo OE (less_oe_missoes.disciplina_tipo) é gravado como código
// curto minúsculo 'lp'/'mat', e a disciplina OE se chama "OE Língua Portuguesa"
// / "OE Matemática" (aulas_nome vazio). Espelha getOESubject do samba-paper v1.

export function oeTipoFromNome(nome: string): 'lp' | 'mat' {
  const l = (nome ?? '').toLowerCase()
  if (l.includes('portugu') || l.includes('lp') || l.includes('língua') || l.includes('lingua')) return 'lp'
  return 'mat'
}
