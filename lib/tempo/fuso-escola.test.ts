// =============================================================================
// Teste do utilitário de fuso. Sem framework de propósito: roda com
//
//   npx tsx shared/tempo/fuso-escola.test.ts
//
// e é o que o CI chama. Um teste que precisa de instalação não roda.
//
// Os casos são os que DERAM defeito de verdade (V1, 24/09/2026) mais o caso
// multi-tenant que ainda vai dar: escola fora do fuso de Brasília.
// =============================================================================

import {
  diaNoFuso, hojeNoFuso, horaNoFuso, diasAntesNoFuso, inicioDaSemanaNoFuso,
  inicioDoDiaUTC, intervaloDoDiaUTC, diaDaColunaSQL,
} from './fuso-escola'

const falhas: string[] = []
function conferir(nome: string, obtido: unknown, esperado: unknown) {
  const ok = String(obtido) === String(esperado)
  console.log(`${ok ? '  ok  ' : '  FALHA'} ${nome}${ok ? '' : `: ${obtido} (esperado ${esperado})`}`)
  if (!ok) falhas.push(nome)
}

// 24/09/2026 23:30 em Bauru = 25/09 02:30 UTC. É a janela que quebra o "hoje".
const noite = new Date('2026-09-25T02:30:00Z')

console.log('\nvirada do dia (21:00–00:00 no horário de Brasília)')
conferir('dia no fuso da escola', diaNoFuso(noite), '2026-09-24')
conferir('dia em UTC — o erro que se quer evitar', noite.toISOString().slice(0, 10), '2026-09-25')
conferir('hora no fuso da escola', horaNoFuso(noite), '23:30')

console.log('\njanela do dia')
const { de, ate } = intervaloDoDiaUTC('2026-09-24')
conferir('início em UTC', de.toISOString(), '2026-09-24T03:00:00.000Z')
conferir('fim exclusivo em UTC', ate.toISOString(), '2026-09-25T03:00:00.000Z')
conferir('registro das 23:30 cai no dia certo', noite >= de && noite < ate, 'true')

console.log('\noutra escola, outro fuso (Acre, −05)')
conferir('dia no Acre', diaNoFuso(noite, 'America/Rio_Branco'), '2026-09-24')
conferir('início do dia no Acre', inicioDoDiaUTC('2026-09-24', 'America/Rio_Branco').toISOString(), '2026-09-24T05:00:00.000Z')

console.log('\naritmética de dias')
conferir('formato de hoje', /^\d{4}-\d{2}-\d{2}$/.test(hojeNoFuso()), 'true')
conferir('formato de N dias antes', /^\d{4}-\d{2}-\d{2}$/.test(diasAntesNoFuso(7)), 'true')
conferir('início da semana é domingo', new Date(inicioDaSemanaNoFuso() + 'T12:00:00Z').getUTCDay(), '0')

console.log('\nSQL cru')
conferir(
  'declara UTC antes de converter',
  diaDaColunaSQL('r."recordedAt"'),
  `((r."recordedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date`,
)

console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)\n` : '\n✓ fuso-escola: todos os casos passaram\n')
process.exit(falhas.length ? 1 : 0)
