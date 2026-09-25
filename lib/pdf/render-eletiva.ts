/**
 * Renderer pra PLANO_ELETIVA.
 *
 * A eletiva saía pelo renderizador genérico, que percorre `meta.fields` e faz
 * uma seção por campo. Duas consequências: o documento chegava desmontado, uma
 * seção para cada linha do formulário; e o que o editor coleta mas não está
 * declarado em DOC_TYPES — habilidades e cronograma — simplesmente não era
 * impresso. O professor preenchia e o papel saía sem.
 *
 * O agrupamento aqui é o da v1 (`renderPlanoEletiva`): Identificação, Proposta
 * Pedagógica (ementa, habilidades, justificativa, objetivos), o cronograma como
 * Conteúdo Programático, e Metodologia e Avaliação fechando. O visual é o da
 * v2 — o que casa é a organização, não a aparência.
 */

import PDFDocument from 'pdfkit'
import { DOC_TYPES, type DocType } from '../doc-types'
import { fullHeader, miniHeader, paginate, type DocHeaderInfo } from './layout'
import {
  docTitle, sectionTitle, subSectionTitle, kv, paragraph, signatureLine,
  divider, spacer, dataTable, bulletList, referenciasAbnt,
} from './primitives'
import { firstPageOptions } from '@pdf'
import { FUSO_PADRAO } from '@/lib/tempo/fuso-escola'

export type EletivaPdfInput = {
  type:       DocType
  title:      string
  content:    Record<string, string>
  schoolName: string
  authorName: string
  createdAt:  Date
}

const NIVEL: Record<string, string> = {
  medio:       'Ensino Médio',
  fundamental: 'Ensino Fundamental',
}

/** Uma por linha, como o seletor de habilidades grava. */
function linhas(raw: string | undefined): string[] {
  return (raw ?? '').split('\n').map(l => l.trim()).filter(Boolean)
}

/** Listas separadas por vírgula (avaliação, materiais). */
function itens(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map(x => x.trim()).filter(Boolean)
}

/**
 * "1º, 3º Bimestres", com queda para o semestre dos documentos antigos.
 *
 * A v2 organizava a eletiva por semestre; voltou a ser por bimestres, como na
 * v1 e como no resto do sistema. Documento já gravado só com `semestre`
 * continua legível.
 */
function periodoLetivo(c: Record<string, string>): { rotulo: string; valor: string } {
  const bims = (c.bimestres ?? '').split(',').map(s => s.trim()).filter(Boolean).sort()
  if (bims.length > 0) {
    return {
      rotulo: bims.length > 1 ? 'Bimestres' : 'Bimestre',
      valor:  bims.map(b => `${b}º`).join(', ') + (bims.length > 1 ? ' Bimestres' : ' Bimestre'),
    }
  }
  const sem = (c.semestre ?? '').trim()
  return { rotulo: 'Semestre', valor: sem ? `${sem}º Semestre` : '—' }
}

export function generateEletivaPdf(input: EletivaPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ ...firstPageOptions(), autoFirstPage: true })
    const chunks: Buffer[] = []

    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const info: DocHeaderInfo = {
      type:       input.type,
      title:      input.title,
      schoolName: input.schoolName,
      authorName: input.authorName,
      createdAt:  input.createdAt,
    }

    fullHeader(doc, info)
    doc.on('pageAdded', () => miniHeader(doc, info))

    const meta = DOC_TYPES[input.type]
    const c    = input.content
    const dateLong = input.createdAt.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: FUSO_PADRAO,
    })

    docTitle(doc, input.title, `${meta.label}  ·  ${dateLong}`)
    paragraph(doc, `${input.schoolName} — ${dateLong}`, { small: true })
    divider(doc)

    // ── Identificação ────────────────────────────────────────────────────────
    const periodo = periodoLetivo(c)
    sectionTitle(doc, 'Identificação')
    if (c.nome_eletiva)       kv(doc, 'Nome da Eletiva',   c.nome_eletiva,                        { inline: true })
    if (c.nivel_ensino)       kv(doc, 'Nível de Ensino',   NIVEL[c.nivel_ensino] ?? c.nivel_ensino, { inline: true })
    kv(doc, periodo.rotulo, periodo.valor, { inline: true })
    if (c.carga_horaria)      kv(doc, 'Carga Horária Semanal',    c.carga_horaria,      { inline: true })
    if (c.professor_parceiro) kv(doc, 'Professor(a) Parceiro(a)', c.professor_parceiro, { inline: true })
    if (c.data_inicio)        kv(doc, 'Primeira Aula',            c.data_inicio,        { inline: true })
    if (c.data_culminancia)   kv(doc, 'Culminância',              c.data_culminancia,   { inline: true })
    spacer(doc, 'md')

    // ── Proposta Pedagógica ──────────────────────────────────────────────────
    const habilidades = linhas(c.habilidades)
    if (c.ementa?.trim() || habilidades.length > 0 || c.justificativa?.trim() || c.objetivos?.trim()) {
      sectionTitle(doc, 'Proposta Pedagógica')
      if (c.ementa?.trim()) {
        subSectionTitle(doc, 'Ementa')
        paragraph(doc, c.ementa, { abnt: true })
      }
      if (habilidades.length > 0) {
        subSectionTitle(doc, 'Habilidades BNCC')
        bulletList(doc, habilidades)
      }
      if (c.justificativa?.trim()) {
        subSectionTitle(doc, 'Justificativa')
        paragraph(doc, c.justificativa, { abnt: true })
      }
      if (c.objetivos?.trim()) {
        subSectionTitle(doc, 'Objetivos')
        paragraph(doc, c.objetivos, { abnt: true })
      }
      spacer(doc, 'md')
    }

    // ── Conteúdo Programático (cronograma) ───────────────────────────────────
    // O editor guarda como JSON: [{ date, acao }]. Cronograma ilegível não
    // derruba a emissão — o resto do plano continua valendo.
    const cronograma = (() => {
      try {
        const v = JSON.parse(c.cronograma || '[]')
        return Array.isArray(v) ? (v as Array<{ date?: string; acao?: string }>) : []
      } catch { return [] }
    })()
    if (cronograma.length > 0) {
      sectionTitle(doc, 'Conteúdo Programático')
      dataTable(
        doc,
        ['#', 'Data', 'Atividade / Tema'],
        cronograma.map((r, i) => [String(i + 1), r.date ?? '—', r.acao ?? '—']),
        { colWeights: [0.4, 1.2, 4] },
      )
      spacer(doc, 'md')
    }

    // ── Metodologia e Avaliação ──────────────────────────────────────────────
    const avaliacao = itens(c.avaliacao)
    const materiais = itens(c.materiais)
    if (c.metodologia?.trim() || avaliacao.length > 0 || materiais.length > 0 || c.composicao_media?.trim()) {
      sectionTitle(doc, 'Metodologia e Avaliação')
      if (c.metodologia?.trim()) {
        subSectionTitle(doc, 'Metodologia')
        paragraph(doc, c.metodologia, { abnt: true })
      }
      if (avaliacao.length > 0) {
        subSectionTitle(doc, 'Avaliação')
        bulletList(doc, avaliacao)
      }
      if (materiais.length > 0) {
        subSectionTitle(doc, 'Materiais e Recursos')
        bulletList(doc, materiais)
      }
      if (c.composicao_media?.trim()) {
        subSectionTitle(doc, 'Composição de Média')
        paragraph(doc, c.composicao_media, { abnt: true })
      }
      spacer(doc, 'md')
    }

    if (c.referencias?.trim()) {
      sectionTitle(doc, 'Referências')
      referenciasAbnt(doc, c.referencias)
    }

    signatureLine(doc, input.authorName)
    paginate(doc, info)
    doc.end()
  })
}
