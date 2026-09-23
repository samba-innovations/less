/**
 * Os nomes de campo que a v1 usava e a v2 renomeou.
 *
 * Os documentos importados já estão gravados com os nomes da v1 — 132 com
 * `dataFim`, 26 com `desenv_p1_outro`, e assim por diante. Renomear no banco
 * exigiria migração de dados; em vez disso o nome novo é derivado na LEITURA,
 * aqui, no único ponto por onde o conteúdo entra no app.
 *
 * O campo antigo NÃO é apagado: o documento continua igual ao que veio da v1, e
 * a adaptação é reversível — some daqui e o dado permanece intacto no banco.
 *
 * O mesmo mapa vale para a importação (db/scripts/import-v1), que renomeia na
 * entrada; aqui é a rede para o que já entrou antes disso.
 */

/** nome na v1 → nome na v2. */
export const RENOMEADOS: Record<string, string> = {
  dataFim:            'data_fim',
  momento_outro:      'momento_outros',
  desenv_p1_outro:    'desenv_p1_outros',
  desenv_p2_outro:    'desenv_p2_outros',
  desenv_p3_outro:    'desenv_p3_outros',
  fechamento_outro:   'fechamento_outros',
  // Guia: a v1 guardava os objetivos das aulas aqui. Hoje é inerte — nenhuma
  // das duas versões imprime objetivos no guia —, mas fica no nome canônico
  // para o dia em que alguém resolver imprimi-los.
  objetivos_gerais:   'objetivo_geral',
  // PEI: o RA do aluno.
  ra_aluno:           'ra',
}

/**
 * O conteúdo com os nomes da v2 preenchidos a partir dos da v1.
 *
 * Só preenche o que está faltando: um documento editado na v2 já tem o nome
 * novo, e o valor dele vence.
 */
export function comNomesDaV2(content: Record<string, string>): Record<string, string> {
  let mexeu = false
  const out = { ...content }
  for (const [velho, novo] of Object.entries(RENOMEADOS)) {
    const valor = content[velho]
    if (valor !== undefined && valor !== '' && (out[novo] === undefined || out[novo] === '')) {
      out[novo] = valor
      mexeu = true
    }
  }
  return mexeu ? out : content
}
