/**
 * Renderer pra PLANO_AULA e OE_PLANO_AULA.
 *
 * Inclui contexto curricular (turma/disciplina/bimestre), aulas selecionadas,
 * objetivos + aprendizagens essenciais e a sequência da aula com momentos
 * (iniciais / desenvolvimento partes 1-3 / fechamento).
 */

import PDFDocument from 'pdfkit'
import { DOC_TYPES, type DocType } from '../doc-types'
import { fullHeader, miniHeader, paginate, type DocHeaderInfo } from './layout'
import {
  sectionTitle, subSectionTitle, paragraph,
  spacer, lightTable, dataTable, bulletList, referenciasAbnt,
} from './primitives'
import {
  cw, cx, COLORS, FONT, SIZE, SPACE, BODY_BOTTOM_Y,
} from './theme'
import { firstPageOptions, addMirroredPage } from '@pdf'

type PDFDoc = InstanceType<typeof PDFDocument>

export type AprendizagemEssencial = { codigo: string; descricao: string }
export type AulaSelecionada = {
  aulaNum: number; titulo: string
  conteudo: string | null; objetivos: string | null
}

export type PlanoAulaInput = {
  type:       DocType
  title:      string
  content:    Record<string, string>
  schoolName: string
  authorName: string
  createdAt:  Date
  aprendizagensEssenciais?: AprendizagemEssencial[]
  aulasSelecionadas?:       AulaSelecionada[]
}

const BIMESTRE_DATAS: Record<number, string> = {
  1: '02/02 a 22/04',
  2: '23/04 a 06/07',
  3: '24/07 a 02/10',
  4: '05/10 a 18/12',
}

type TipoAula = 'individual' | 'dupla'
const TIPO_AULA_CFG: Record<TipoAula, { titulo: string; inicio: string; desenv: string; fim: string }> = {
  individual: { titulo: 'Aula de 50 minutos',          inicio: '0–10 min',  desenv: '10–40 min', fim: '40–50 min'  },
  dupla:      { titulo: 'Aula de 1 hora e 40 minutos', inicio: '0–15 min',  desenv: '15–85 min', fim: '85–100 min' },
}

// ── Renderiza badges com pipes: "01 Algo / 02 Outra" → bullet list ──────────
function badgeListBlock(doc: PDFDoc, value: string) {
  if (!value?.trim()) return
  const items = value.split(/\s*\/\s*/).filter(Boolean)
  bulletList(doc, items)
}

function ensureSpace(doc: PDFDoc, needed: number) {
  if (doc.y + needed > BODY_BOTTOM_Y) addMirroredPage(doc)
}

/**
 * Quebra um campo de texto em tópicos.
 *
 * O catálogo do currículo não usa um separador só. Nas 6.320 aulas: 2.654
 * separam os objetivos por "•", 977 por quebra de linha e 292 por ";" — e o
 * conteúdo segue o mesmo padrão misturado (2.573 com "•", 470 com quebra).
 * Quebrar só na linha deixava três objetivos colados num tópico único, com os
 * "•" aparecendo no meio da frase.
 */
function emTopicos(valor: string): string[] {
  return valor
    .split(/\r?\n|\s*[•·]\s*|\s+\/\s+|\s*;\s*/)
    .map(s => s.replace(/^[\s\-•·*–]+/, '').trim())
    // 1 caractere é resto de separador, não tópico.
    .filter(s => s.length > 1)
}

/**
 * Separa "EF06MA01 Comparar…" em código + texto. Sem código reconhecido,
 * devolve a linha inteira como texto — melhor que inventar uma coluna vazia.
 */
function separarCodigo(linha: string): { codigo: string; texto: string } {
  const m = linha.match(/^\(?\s*([A-Z]{2}\d{2}[A-Z]{2,4}\d{2,3}[A-Z]?\d{0,2})\s*\)?\s*[—–\-:]?\s*(.*)$/)
  if (m && m[2]?.trim()) return { codigo: m[1], texto: m[2].trim() }
  return { codigo: '', texto: linha }
}

/** Lista separada por vírgula/ponto vira uma frase só, para caber na célula. */
function listaEmLinha(valor: string): string {
  return valor.split(/\r?\n|\s*[·,]\s*/).map(s => s.trim()).filter(Boolean).join('; ')
}

// ── Bloco "tempo - título" (ex: "0–10 min · Momentos Iniciais") ──────────────
function timeBlock(doc: PDFDoc, time: string, label: string) {
  ensureSpace(doc, 24)
  doc.y += SPACE.sm
  doc.font(FONT.bold).fontSize(SIZE.tiny).fillColor(COLORS.fgMuted)
    .text(time.toUpperCase(), cx(doc), doc.y, { width: 80, lineBreak: false, characterSpacing: 0.5 })
  doc.font(FONT.bold).fontSize(SIZE.small).fillColor(COLORS.fg)
    .text(label, cx(doc) + 85, doc.y, { width: cw(doc) - 85, lineBreak: false })
  doc.y += 16
}

// ── Bloco com 3 partes lado a lado (Desenvolvimento p1/p2/p3) ───────────────
function partesDesenvBlock(doc: PDFDoc, p1: string, p2: string, p3: string) {
  const partes = [
    { label: 'Parte 1', value: p1 },
    { label: 'Parte 2', value: p2 },
    { label: 'Parte 3', value: p3 },
  ].filter(p => p.value?.trim())

  if (partes.length === 0) return

  ensureSpace(doc, 60)
  const colW = (cw(doc) - SPACE.sm * (partes.length - 1)) / partes.length
  const startY = doc.y

  for (let i = 0; i < partes.length; i++) {
    const x = cx(doc) + i * (colW + SPACE.sm)
    doc.font(FONT.bold).fontSize(SIZE.tiny).fillColor(COLORS.fgMuted)
      .text(partes[i].label.toUpperCase(), x, startY, { width: colW, characterSpacing: 0.4 })

    const items = partes[i].value.split(/\s*\/\s*/).filter(Boolean)
    let y = startY + 14
    for (const item of items) {
      doc.font(FONT.regular).fontSize(SIZE.small).fillColor(COLORS.fg)
        .text(`• ${item}`, x, y, { width: colW, lineGap: 1 })
      y = doc.y + 3
    }
  }
  doc.y = startY + 14
  // avança até o fim da coluna mais alta
  doc.y = Math.max(doc.y, startY + 60)
  doc.y += SPACE.md
}

export function generatePlanoAulaPdf(input: PlanoAulaInput): Promise<Buffer> {
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

    // O título e a data já são desenhados pelo shared/pdf renderFullHeader.
    // Aqui só damos um respiro antes do corpo iniciar.
    spacer(doc, 'md')

    // ── Identificação ────────────────────────────────────────────────────────
    // Um plano pode cobrir mais de um bimestre (recuperação atravessa o
    // fechamento), e aí `bimestres` traz a lista: "2,3".
    const bimList = (c.bimestres ?? '')
      .split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0)
    const bimUsados = bimList.length > 0 ? [...new Set(bimList)].sort((a, b) => a - b)
                    : (Number(c.bimestre) > 0 ? [Number(c.bimestre)] : [])
    const bimLabel =
      bimUsados.length === 0 ? '—'
      : bimUsados.length === 1
        ? (BIMESTRE_DATAS[bimUsados[0]]
            ? `${bimUsados[0]}º Bimestre — ${BIMESTRE_DATAS[bimUsados[0]]}`
            : `${bimUsados[0]}º Bimestre`)
        : `${bimUsados.slice(0, -1).map(n => `${n}º`).join(', ')} e ${bimUsados[bimUsados.length - 1]}º Bimestres`

    // Formata data: aceita ISO (2026-09-03), BR (03/09/2026) ou vazio
    function fmtData(s: string | undefined): string {
      if (!s) return dateLong
      const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (iso) {
        const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`)
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      }
      return s
    }

    /** "21 de setembro de 2026" ou "de 21 … a 3 de outubro de 2026". */
    function periodo(inicio: string | undefined, fim: string | undefined): string {
      if (!fim?.trim() || fim === inicio) return fmtData(inicio)
      return `de ${fmtData(inicio)} a ${fmtData(fim)}`
    }

    sectionTitle(doc, 'Identificação')
    const identificacao: string[][] = [
      ['Turma',      c.turmas || c.turma || '—'],
      ['Disciplina', c.disciplina || '—'],
      ['Bimestre',   bimLabel],
      ['Data',       periodo(c.data, c.data_fim)],
    ]
    if (c.tema) identificacao.push(['Tema / Título da Aula', c.tema])
    dataTable(doc, ['Campo', 'Informação'], identificacao, { colWeights: [1.3, 3.7] })

    // ── Aulas Selecionadas ───────────────────────────────────────────────────
    if (input.aulasSelecionadas && input.aulasSelecionadas.length > 0) {
      sectionTitle(doc, 'Aulas Selecionadas')
      const headers = ['Aula', 'Título', 'Conteúdo', 'Objetivos']
      const rows = input.aulasSelecionadas.map(a => [
        String(a.aulaNum),
        a.titulo ?? '',
        a.conteudo ?? '—',
        a.objetivos ?? '—',
      ])
      lightTable(doc, headers, rows, [0.8, 2.5, 3, 3])
    }

    // ── Objetivos + Habilidades ──────────────────────────────────────────────
    sectionTitle(doc, 'Objetivos e Habilidades')
    if (c.objetivo_geral) {
      subSectionTitle(doc, 'Objetivos')
      bulletList(doc, emTopicos(c.objetivo_geral))
    }
    if (c.habilidades?.trim()) {
      subSectionTitle(doc, 'Habilidades')
      const linhas = emTopicos(c.habilidades).map(separarCodigo)
      // Só abre a coluna de código quando pelo menos uma habilidade tem código
      // (BNCC/Currículo Paulista); senão a coluna fica vazia ocupando espaço.
      if (linhas.some(l => l.codigo)) {
        dataTable(doc, ['Código', 'Habilidade'], linhas.map(l => [l.codigo, l.texto]), { colWeights: [1, 4] })
      } else {
        dataTable(doc, ['Habilidade'], linhas.map(l => [l.texto]))
      }
    }
    if (input.aprendizagensEssenciais && input.aprendizagensEssenciais.length > 0) {
      subSectionTitle(doc, 'Aprendizagens Essenciais')
      lightTable(
        doc,
        ['Código', 'Descrição'],
        input.aprendizagensEssenciais.map(a => [a.codigo, a.descricao]),
        [1, 5],
      )
    }
    if (c.objeto_conhecimento) {
      subSectionTitle(doc, 'Objeto de Conhecimento')
      paragraph(doc, c.objeto_conhecimento, { abnt: true })
    }

    // ── Sequência da Aula ────────────────────────────────────────────────────
    const hasSeq = c.desenvolvimento_inicial || c.desenv_p1 || c.desenv_p2 || c.desenv_p3 || c.desenvolvimento_fechamento
    if (hasSeq) {
      sectionTitle(doc, 'Sequência da Aula')
      const tipo = ((c.tipo_aula ?? 'individual') as TipoAula)
      const cfg  = TIPO_AULA_CFG[tipo] ?? TIPO_AULA_CFG.individual
      doc.font(FONT.italic).fontSize(SIZE.small).fillColor(COLORS.fgMuted)
        .text(cfg.titulo, cx(doc), doc.y, { width: cw(doc) })
      doc.y += SPACE.sm

      if (c.desenvolvimento_inicial) {
        timeBlock(doc, cfg.inicio, 'Momentos Iniciais')
        badgeListBlock(doc, c.desenvolvimento_inicial)
      }
      if (c.desenv_p1 || c.desenv_p2 || c.desenv_p3) {
        timeBlock(doc, cfg.desenv, 'Desenvolvimento')
        partesDesenvBlock(doc, c.desenv_p1 ?? '', c.desenv_p2 ?? '', c.desenv_p3 ?? '')
      }
      if (c.desenvolvimento_fechamento) {
        timeBlock(doc, cfg.fim, 'Momentos Finais')
        badgeListBlock(doc, c.desenvolvimento_fechamento)
      }
    }

    // ── Conteúdo ─────────────────────────────────────────────────────────────
    if (c.conteudo?.trim()) {
      sectionTitle(doc, 'Conteúdo')
      const itens = emTopicos(c.conteudo)
      dataTable(doc, ['Nº', 'Conteúdo'], itens.map((it, i) => [String(i + 1), it]), { colWeights: [0.5, 6] })
    }

    // ── Recursos e Avaliação ─────────────────────────────────────────────────
    const linhasRA: string[][] = []
    if (c.recursos_materiais?.trim()) linhasRA.push(['Recursos e materiais', listaEmLinha(c.recursos_materiais)])
    if (c.avaliacao?.trim())          linhasRA.push(['Avaliação',           listaEmLinha(c.avaliacao)])
    if (c.ajustes_demanda?.trim())    linhasRA.push(['Ajuste(s) por demanda', c.ajustes_demanda.trim()])
    if (linhasRA.length > 0) {
      sectionTitle(doc, 'Recursos e Avaliação')
      dataTable(doc, ['Item', 'Descrição'], linhasRA, { colWeights: [1.3, 3.7] })
    }
    if (c.referencias?.trim()) {
      sectionTitle(doc, 'Referências')
      referenciasAbnt(doc, c.referencias)
    }

    paginate(doc, info)
    doc.end()
  })
}
