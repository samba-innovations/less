/**
 * Renderer pra CARTA_NAUTICA — o mapa de slides da aula.
 *
 * A carta era o tipo menos casado dos sete: `DOC_TYPES.CARTA_NAUTICA` declara
 * `fields: []` e o tipo estava no gerador genérico, que monta as seções
 * percorrendo exatamente essa lista vazia. Medido numa carta real, com 2,4 KB de
 * mapa de slides e 630 bytes de aprendizagens essenciais: o PDF saía com 404
 * caracteres — cabeçalho, título e rodapé, e mais nada.
 *
 * A v1 imprime um mapa visual em paisagem, com cinco faixas (Porto, Professor,
 * Rota, Farol, Navegação). Aqui a MESMA informação é organizada no formato
 * retrato do design system da v2: o porto abre o documento, cada aula vira um
 * bloco com sua tabela de slides, e a legenda fecha. O que casa é o conteúdo do
 * mapa, não o desenho — a modernização do front é intencional.
 */

import PDFDocument from 'pdfkit'
import { DOC_TYPES, type DocType } from '../doc-types'
import { fullHeader, miniHeader, paginate, type DocHeaderInfo } from './layout'
import {
  docTitle, sectionTitle, subSectionTitle, kv, paragraph, signatureLine,
  divider, spacer, dataTable, lightTable,
} from './primitives'
import { firstPageOptions } from '@pdf'

export type CartaPdfInput = {
  type:       DocType
  title:      string
  content:    Record<string, string>
  schoolName: string
  authorName: string
  createdAt:  Date
}

/**
 * Os cinco momentos pedagógicos, com a abreviação que a escola usa na lousa.
 * Mesmos ids e mesmos rótulos da v1 e do editor da v2 — são contrato: o
 * documento guarda o id do tipo em `aulas_slides_json`.
 */
const FAROL: Record<string, { label: string; abbrev: string }> = {
  para_comecar:  { label: 'Para começar',     abbrev: 'PC' },
  relembre:      { label: 'Relembre',         abbrev: 'R'  },
  foco_conteudo: { label: 'Foco no conteúdo', abbrev: 'FC' },
  na_pratica:    { label: 'Na prática',       abbrev: 'NP' },
  encerramento:  { label: 'Encerramento',     abbrev: 'E'  },
}

const ORDEM_FAROL = ['para_comecar', 'relembre', 'foco_conteudo', 'na_pratica', 'encerramento']

type Slide = { slideNum: number; tipo: string }
type Aula  = {
  aulaId?: number; aulaNum: number; titulo?: string
  conteudo?: string | null; objetivos?: string | null
  slides?: Slide[]
}
type AE = { codigo: string; descricao: string }

function lerJson<T>(raw: string | undefined): T[] {
  try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? (v as T[]) : [] } catch { return [] }
}

/**
 * A linha de navegação de cada slide.
 *
 * Na v1, o conteúdo da aula é quebrado por linha e cada slide recebe a sua, na
 * ordem; quando acaba, repete a primeira. Sem conteúdo, fica o título da aula.
 */
function navegacao(aula: Aula, indice: number): string {
  const linhas = (aula.conteudo ?? '').split('\n').map(l => l.trim()).filter(Boolean)
  return linhas[indice] ?? linhas[0] ?? aula.titulo ?? '—'
}

export function generateCartaPdf(input: CartaPdfInput): Promise<Buffer> {
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

    const aulas = lerJson<Aula>(c.aulas_slides_json).filter(a => (a.slides ?? []).length > 0)
    const aes   = lerJson<AE>(c.aes_json)
    const rotas = aulas.reduce((s, a) => s + (a.slides ?? []).length, 0)

    // ── Identificação ────────────────────────────────────────────────────────
    // `_ciclo`/`_serie` são do editor da v2; `ciclo`/`serie`, dos documentos da
    // v1. A importação espelha os dois, e aqui os dois são aceitos.
    sectionTitle(doc, 'Identificação')
    const turma = c.turmas || c.turma || ''
    if (turma)        kv(doc, 'Turma(s)',   turma,        { inline: true })
    if (c.disciplina) kv(doc, 'Disciplina', c.disciplina, { inline: true })
    if (c.bimestre)   kv(doc, 'Bimestre',   `${c.bimestre}º Bimestre`, { inline: true })
    if (c.periodo)    kv(doc, 'Período',    c.periodo,    { inline: true })
    if (aulas.length > 0) {
      kv(doc, 'Rotas', `${aulas.length} ${aulas.length === 1 ? 'aula' : 'aulas'} · ${rotas} ${rotas === 1 ? 'slide' : 'slides'}`, { inline: true })
    }
    spacer(doc, 'md')

    // ── Porto: as aprendizagens essenciais que a carta persegue ──────────────
    if (aes.length > 0) {
      sectionTitle(doc, 'Porto — Aprendizagens Essenciais')
      lightTable(doc, ['Código', 'Descrição'], aes.map(a => [a.codigo, a.descricao]), [1, 5])
    }

    // ── O mapa, aula por aula ────────────────────────────────────────────────
    if (aulas.length === 0) {
      sectionTitle(doc, 'Mapa de Slides')
      paragraph(doc, 'Nenhuma aula mapeada nesta carta.', { small: true })
    } else {
      sectionTitle(doc, 'Mapa de Slides')
      for (const aula of aulas) {
        const slides = [...(aula.slides ?? [])].sort((a, b) => a.slideNum - b.slideNum)
        subSectionTitle(doc, `Aula ${aula.aulaNum}${aula.titulo ? ` — ${aula.titulo}` : ''}`)
        if (aula.objetivos?.trim()) paragraph(doc, aula.objetivos, { small: true })
        dataTable(
          doc,
          ['Rota', 'Farol', 'Navegação'],
          slides.map((s, i) => [
            `Slide ${s.slideNum}`,
            `${FAROL[s.tipo]?.abbrev ?? '—'} · ${FAROL[s.tipo]?.label ?? s.tipo}`,
            navegacao(aula, i),
          ]),
          { colWeights: [0.9, 1.6, 3.5] },
        )
        spacer(doc, 'sm')
      }
    }

    // ── Legenda ──────────────────────────────────────────────────────────────
    // Fecha o documento como na v1: sem ela as abreviações da coluna Farol não
    // dizem nada para quem recebe a carta impressa.
    sectionTitle(doc, 'Legenda dos Faróis')
    lightTable(
      doc,
      ['Sigla', 'Momento pedagógico'],
      ORDEM_FAROL.map(t => [FAROL[t].abbrev, FAROL[t].label]),
      [1, 5],
    )

    signatureLine(doc, input.authorName)
    paginate(doc, info)
    doc.end()
  })
}
