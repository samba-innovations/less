/**
 * Renderer pra GUIA_APRENDIZAGEM e OE_GUIA_APRENDIZAGEM.
 *
 * Contexto curricular (turma/disciplina/bimestre), aprendizagens essenciais,
 * aulas selecionadas e os campos do guia (tema, competências, habilidades,
 * conteúdos, estratégias, recursos, avaliação, composição de média, referências).
 */

import PDFDocument from 'pdfkit'
import { DOC_TYPES, type DocType } from '../doc-types'
import { fullHeader, miniHeader, paginate, type DocHeaderInfo } from './layout'
import {
  docTitle, sectionTitle, subSectionTitle, kv, paragraph, signatureLine,
  divider, spacer, lightTable, bulletList, referenciasAbnt,
} from './primitives'
import { firstPageOptions } from '@pdf'
import type { AprendizagemEssencial, AulaSelecionada } from './render-plano-aula'

export type GuiaPdfInput = {
  type:       DocType
  title:      string
  content:    Record<string, string>
  schoolName: string
  authorName: string
  createdAt:  Date
  aprendizagensEssenciais?: AprendizagemEssencial[]
  aulasSelecionadas?:       AulaSelecionada[]
}

/** dd/mm/aaaa a partir de ISO ou do que o editor gravou. */
function dataBR(iso: string | undefined): string {
  const v = (iso ?? '').trim()
  if (!v) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v
}

/**
 * O período do bimestre, do calendário que o editor carimbou no documento.
 *
 * Existia aqui uma tabela fixa de datas, a mesma que estava no editor e que não
 * bate com o calendário da escola. Agora as duas pontas leem o less_bimestres,
 * via data_inicio/data_fim.
 */
function periodo(c: Record<string, string>): string {
  const ini = dataBR(c.data_inicio), fim = dataBR(c.data_fim)
  if (ini && fim) return `${ini} a ${fim}`
  return ini
}

/** Cada linha é uma técnica ("Nome — descritor"); o campo não é lista por vírgula. */
function linhas(raw: string | undefined): string[] {
  return (raw ?? '').split('\n').map(l => l.trim()).filter(Boolean)
}

/** Recursos e avaliação são listas separadas por vírgula, como o seletor grava. */
function itens(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map(x => x.trim()).filter(Boolean)
}


function parseJsonArray(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.map(String) : [] } catch { return [] }
}

export function generateGuiaPdf(input: GuiaPdfInput): Promise<Buffer> {
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
    const dateLong = input.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

    docTitle(doc, input.title, `${meta.label}  ·  ${dateLong}`)
    paragraph(doc, `${input.schoolName} — ${dateLong}`, { small: true })
    divider(doc)

    // ── Identificação ────────────────────────────────────────────────────────
    // As chaves com underscore são as da cascata do plano de aula, e o guia não
    // preenche nenhuma delas: ele grava turma/turmas, disciplina e bimestre sem
    // prefixo, como na v1. Lidas só como alternativa, para o guia da OE, que vem
    // pela outra cascata.
    const turma      = c.turmas || c.turma || c._turma_nome || ''
    const disciplina = c.disciplina || c._disciplina_nome || ''
    const bim        = c.bimestre || c._bimestre || ''
    const per        = periodo(c)
    const bimLabel   = bim ? (per ? `${bim}º Bimestre — ${per}` : `${bim}º Bimestre`) : ''
    // Em Projeto de Vida a escola chama o tema de projeto do bimestre.
    const isPV       = disciplina.toLowerCase().includes('projeto de vida')

    sectionTitle(doc, 'Identificação')
    if (turma)        kv(doc, 'Turma(s)',   turma,        { inline: true })
    if (disciplina)   kv(doc, 'Disciplina', disciplina,   { inline: true })
    if (bimLabel)     kv(doc, 'Bimestre',   bimLabel,     { inline: true })
    if (c.ano_letivo) kv(doc, 'Ano Letivo', c.ano_letivo, { inline: true })
    if (c.tema)       kv(doc, isPV ? 'Projeto do Bimestre' : 'Tema', c.tema, { inline: true })
    spacer(doc, 'md')

    // ── Aprendizagens Essenciais ────────────────────────────────────────────
    if (input.aprendizagensEssenciais && input.aprendizagensEssenciais.length > 0) {
      sectionTitle(doc, 'Aprendizagens Essenciais')
      lightTable(
        doc,
        ['Código', 'Descrição'],
        input.aprendizagensEssenciais.map(a => [a.codigo, a.descricao]),
        [1, 5],
      )
    }

    // ── Aulas Selecionadas (se houver) ──────────────────────────────────────
    if (input.aulasSelecionadas && input.aulasSelecionadas.length > 0) {
      sectionTitle(doc, 'Aulas do Bimestre')
      lightTable(
        doc,
        ['Aula', 'Título', 'Conteúdo'],
        input.aulasSelecionadas.map(a => [String(a.aulaNum), a.titulo ?? '', a.conteudo ?? '—']),
        [0.8, 2.5, 4],
      )
    }

    // ── Competências e habilidades (campos descritivos) ────────────────────
    if (c.competencias?.trim()) {
      sectionTitle(doc, 'Competências Gerais (BNCC)')
      paragraph(doc, c.competencias, { abnt: true })
    }
    if (c.habilidades?.trim()) {
      sectionTitle(doc, 'Habilidades Específicas')
      paragraph(doc, c.habilidades, { abnt: true })
    }
    if (c.conteudos?.trim()) {
      sectionTitle(doc, 'Conteúdos Programáticos')
      paragraph(doc, c.conteudos, { abnt: true })
    }

    // ── Metodologia e avaliação ─────────────────────────────────────────────
    // Estas três saíam pelo formatChips, que separa por vírgula. As estratégias
    // são uma por linha ("Nome — descritor"), e os descritores têm vírgula: o
    // campo saía picado no meio das frases. Cada um volta a sair no formato em
    // que o editor grava, como na v1.
    const estrategias = linhas(c.estrategias)
    const recursos    = itens(c.recursos)
    const avaliacao   = itens(c.avaliacao)

    if (estrategias.length > 0 || recursos.length > 0 || avaliacao.length > 0 || c.ajustes_demanda?.trim()) {
      sectionTitle(doc, 'Metodologia e Avaliação')
      if (estrategias.length > 0) {
        subSectionTitle(doc, isPV ? 'Estratégias Socioemocionais' : 'Estratégias Didáticas')
        bulletList(doc, estrategias)
      }
      if (recursos.length > 0) {
        subSectionTitle(doc, 'Recursos e Materiais')
        bulletList(doc, recursos)
      }
      if (avaliacao.length > 0) {
        subSectionTitle(doc, isPV ? 'Avaliação Socioemocional' : 'Avaliação Bimestral')
        bulletList(doc, avaliacao)
      }
      if (c.ajustes_demanda?.trim()) {
        subSectionTitle(doc, 'Ajuste(s) por Demanda')
        paragraph(doc, c.ajustes_demanda, { abnt: true })
      }
      spacer(doc, 'md')
    }

    // ── Instrumentos Avaliativos (parsed JSON list) ─────────────────────────
    const instrumentos = parseJsonArray(c._instrumentos)
    if (instrumentos.length > 0) {
      sectionTitle(doc, 'Instrumentos Avaliativos')
      bulletList(doc, instrumentos)
    }

    // ── Composição de média ─────────────────────────────────────────────────
    if (c.composicao_media?.trim()) {
      sectionTitle(doc, 'Composição de Média')
      paragraph(doc, c.composicao_media, { abnt: true })
    }

    // ── Referências ─────────────────────────────────────────────────────────
    // Uma entrada por linha, com autor em versalete e título em itálico — o
    // mesmo tratamento do plano de aula, que antes era um parágrafo corrido.
    if (c.referencias?.trim()) {
      sectionTitle(doc, 'Referências')
      referenciasAbnt(doc, c.referencias)
    }

    signatureLine(doc, input.authorName)
    paginate(doc, info)
    doc.end()
  })
}
