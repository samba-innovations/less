// =============================================================================
// Fuso horário — fonte única.
//
// POR QUE ISTO EXISTE
// -------------------
// Os containers das apps rodam em UTC (nenhum serviço Next tem `TZ` no
// docker-compose; só os 4 do Jitsi têm). Duas consequências que já causaram
// defeito de produção na V1, em 24/09/2026:
//
//   1. `new Date().toISOString().slice(0, 10)` devolve a data em UTC. Das
//      21:00 à meia-noite no horário de Brasília, isso já é o DIA SEGUINTE —
//      e vira chave de agrupamento, filtro de "hoje" e nome de arquivo.
//   2. `toLocaleString`/`toLocaleTimeString` SEM `timeZone` formatam no fuso do
//      processo, que é UTC. Na V1 isso mandou 1.098 notificações à direção com
//      a hora 3h adiantada ("às 16:46" para um registro das 13:46).
//
// Repare que `TZ` no container resolveria (2) mas NÃO resolve (1): `toISOString`
// é sempre UTC, por definição. Por isso a regra é explícita no código, não
// ambiente — e assim o comportamento é o mesmo na máquina do dev (Brasil) e no
// servidor (Europa).
//
// O QUE NÃO MUDA
// --------------
// O que é GRAVADO continua sendo instante em UTC. O Prisma escreve UTC nas
// colunas `DateTime` (`timestamp(3)` sem fuso, que é o default — só 1 coluna do
// schema usa `@db.Timestamptz`). Esse é o contrato certo e é o que a V1 já tem,
// então a importação do histórico da V1 entra sem conversão. Virar o fuso do
// container faria a MESMA coluna guardar UTC no passado e horário local daí em
// diante, sem fronteira visível — é exatamente o que não se quer antes de puxar
// os dados da V1.
//
// MULTI-TENANT
// ------------
// Toda função aceita o fuso como parâmetro. O padrão é America/Sao_Paulo porque
// é onde está a primeira escola, mas o Brasil tem quatro fusos (Acre −05,
// Amazonas −04, Brasília −03, Fernando de Noronha −02): uma escola no Acre
// fecharia o dia 3h cedo demais com valor fixo. Hoje `User.timezone` já existe
// no schema (e o hub coleta no ProfileWizard); falta o mesmo em `School` —
// enquanto não existir, passe o do usuário quando tiver, ou deixe o padrão.
// =============================================================================

/** Fuso da primeira escola. Use como fallback, nunca como verdade absoluta. */
export const FUSO_PADRAO = 'America/Sao_Paulo'

/** 'YYYY-MM-DD' no fuso pedido. 'en-CA' é o locale que formata nesse formato. */
export function diaNoFuso(quando: Date = new Date(), fuso: string = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuso }).format(quando)
}

/** Que dia é hoje para quem está na escola. */
export function hojeNoFuso(fuso: string = FUSO_PADRAO): string {
  return diaNoFuso(new Date(), fuso)
}

// Âncora ao MEIO-DIA UTC: somar/subtrair dias a partir da meia-noite passearia
// pela borda do fuso e devolveria o dia vizinho.
function ancora(dia: string): Date {
  return new Date(`${dia}T12:00:00Z`)
}

/** N dias antes de hoje, em 'YYYY-MM-DD'. */
export function diasAntesNoFuso(n: number, fuso: string = FUSO_PADRAO): string {
  const d = ancora(hojeNoFuso(fuso))
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Domingo da semana corrente, em 'YYYY-MM-DD'. */
export function inicioDaSemanaNoFuso(fuso: string = FUSO_PADRAO): string {
  const d = ancora(hojeNoFuso(fuso))
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}

/** 'HH:MM' no fuso pedido. */
export function horaNoFuso(quando: Date, fuso: string = FUSO_PADRAO): string {
  return quando.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: fuso,
  })
}

/** 'DD/MM/AAAA' no fuso pedido. */
export function dataNoFuso(quando: Date, fuso: string = FUSO_PADRAO): string {
  return quando.toLocaleDateString('pt-BR', { timeZone: fuso })
}

/** 'DD/MM/AAAA HH:MM' no fuso pedido — rodapé de PDF, "gerado em", etc. */
export function dataHoraNoFuso(quando: Date = new Date(), fuso: string = FUSO_PADRAO): string {
  return quando.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: fuso,
  })
}

// ─── Janela do dia ───────────────────────────────────────────────────────────
//
// O caso mais comum e mais silencioso da V2: filtrar registros por dia com
//
//     const de  = new Date(dia + 'T00:00:00')
//     const ate = new Date(dia + 'T23:59:59')
//
// Sem sufixo de fuso, o JS interpreta no fuso do PROCESSO — que no container é
// UTC. A janela vira das 21:00 do dia anterior às 20:59 do dia, no horário de
// Brasília. O expediente escolar cai dentro dela por sorte; o fim da noite, não.

/** Minutos que `fuso` está à frente do UTC naquele instante (São Paulo: −180). */
function deslocamentoMin(fuso: string, quando: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(quando)
  const v: Record<string, number> = {}
  for (const p of partes) if (p.type !== 'literal') v[p.type] = Number(p.value)
  // `hour` volta como 24 à meia-noite em alguns runtimes; 24 % 24 = 0.
  const comoSeFosseUTC = Date.UTC(v.year, v.month - 1, v.day, v.hour % 24, v.minute, v.second)
  return (comoSeFosseUTC - quando.getTime()) / 60000
}

/** Instante UTC em que começa o dia 'YYYY-MM-DD' no fuso pedido. */
export function inicioDoDiaUTC(dia: string, fuso: string = FUSO_PADRAO): Date {
  const palpite = new Date(`${dia}T00:00:00Z`)
  let r = new Date(palpite.getTime() - deslocamentoMin(fuso, palpite) * 60000)
  // Segunda passada: em fuso com horário de verão, o deslocamento do palpite
  // pode ser o do dia anterior. O Brasil não tem mais DST, mas a V2 é vendida
  // para fora e Intl cobre o mundo todo.
  const conferido = deslocamentoMin(fuso, r)
  if (conferido !== deslocamentoMin(fuso, palpite)) {
    r = new Date(palpite.getTime() - conferido * 60000)
  }
  return r
}

/**
 * Janela do dia no fuso da escola, para `WHERE campo >= de AND campo < ate`.
 *
 * O limite superior é EXCLUSIVO de propósito: `23:59:59` perde o registro feito
 * em 23:59:59.500, e `lte` com milissegundos é uma discussão que não precisa
 * existir.
 */
export function intervaloDoDiaUTC(dia: string, fuso: string = FUSO_PADRAO): { de: Date; ate: Date } {
  const de = inicioDoDiaUTC(dia, fuso)
  const ate = new Date(de.getTime())
  ate.setUTCDate(ate.getUTCDate() + 1)
  // Recalcula pelo dia seguinte para não escorregar em virada de horário de verão.
  return { de, ate: inicioDoDiaUTC(diaNoFuso(ate, fuso), fuso) }
}

/**
 * Trecho de SQL cru para converter uma coluna `timestamp` SEM fuso (que guarda
 * UTC) para a DATA no fuso da escola.
 *
 *   WHERE ${diaDaColunaSQL('r."recordedAt"')} = ${hojeNoFuso()}::date
 *
 * A ordem importa e é contraintuitiva: `coluna AT TIME ZONE 'America/Sao_Paulo'`
 * sozinho INTERPRETA o valor como se já fosse horário de São Paulo — converte
 * para o lado errado. Primeiro se declara que o guardado é UTC, e só então se
 * converte. Esse exato engano estava na V1 (`checkStudentTodayActivity`), ainda
 * por cima comparado com `CURRENT_DATE`, que é a data em UTC.
 */
export function diaDaColunaSQL(coluna: string, fuso: string = FUSO_PADRAO): string {
  return `((${coluna} AT TIME ZONE 'UTC') AT TIME ZONE '${fuso}')::date`
}
