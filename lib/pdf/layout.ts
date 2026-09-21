/**
 * Layout do PDF do less.
 *
 * A partir de agora este arquivo é um WRAPPER FINO sobre `@pdf` (shared/pdf).
 * Header e footer são canônicos institucionais do samba education
 * (filete brand + brasão + logotipo do sistema + rodapé institucional
 * com endereço/contato da escola).
 *
 * As assinaturas (fullHeader, miniHeader, paginate) foram preservadas pra
 * NÃO quebrar os renderers existentes (render-plano-aula, render-guia,
 * ata-pdf, render-generic). Internamente delegam ao shared.
 */

import type PDFDocument from 'pdfkit'
import { db } from '@/lib/db'
import {
  renderFullHeader, renderMiniHeader, renderFooter as sharedFooter,
  paginateAndFooter, setLogoDir, type HeaderCtx, type SchoolInfo, type LayoutOpts,
} from '@pdf'
import { DOC_TYPES, type DocType } from '../doc-types'
import { FONT, SIZE, COLORS } from './theme'

// Aponta o loader pra pasta dos SVGs (bind mount do compose)
setLogoDir(process.env.PDF_LOGOS_DIR ?? '/app/pdf-logos')

// Sem override de margem: o shared lê as margens da página atual, que são
// espelhadas (interna 3cm / externa 2cm, trocando de lado a cada página).
const LESS_LAYOUT: LayoutOpts = {}

type PDFDoc = InstanceType<typeof PDFDocument>

// ── Contract preservado (usado por render-plano-aula.ts, render-guia.ts…) ──
export type DocHeaderInfo = {
  type:       DocType
  title:      string
  schoolName: string
  authorName: string
  createdAt:  Date
  // extras opcionais — se vierem, entram no rodapé institucional
  school?:    SchoolInfo
}

// Cache leve da SchoolInfo por schoolName (evita hit no banco em cada página)
// Cache com TTL curto — logo/dados institucionais mudam raramente mas
// quando mudam (upload no /dashboard/escola) o PDF precisa refletir logo.
const CACHE_TTL_MS = 30_000
const _schoolCache = new Map<string, { s: SchoolInfo; at: number }>()
async function _loadSchool(name: string): Promise<SchoolInfo> {
  const hit = _schoolCache.get(name)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.s
  }
  const row = await db.school.findFirst({
    where: {
      OR: [
        { officialName: name },
        { organization: { name: name } },
      ],
    },
    select: {
      officialName: true, addressStreet: true, addressNumber: true, addressExtra: true,
      neighborhood: true, city: true, state: true, postalCode: true,
      phone: true, contactEmail: true, website: true, cnpj: true, inepCode: true, logoUrl: true,
    },
  }).catch((e) => { console.error('[school-load] db error:', e.message); return null })
  const s: SchoolInfo = row ?? { officialName: name }
  if (!s.officialName) s.officialName = name

  // Pré-carrega logo do MinIO pra Buffer (evita I/O no header sync)
  if (s.logoUrl) {
    try {
      const key = s.logoUrl.replace(/^\/api\/photos\//, '')
      const { getPhotoStream } = await import('@/lib/storage')
      const res = await getPhotoStream(key)
      const stream = res.Body as unknown as NodeJS.ReadableStream
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(Buffer.from(chunk as Uint8Array))
      s.logoBuffer = Buffer.concat(chunks)
    } catch (e) {
      console.error('[school-logo] error:', (e as Error).message)
      s.logoBuffer = null
    }
  }

  _schoolCache.set(name, { s, at: Date.now() })
  return s
}

// Ctx é construído sync na primeira chamada. Pra evitar await no meio do
// render, o consumidor pode chamar `prepareSchoolInfo(name)` antes.
export async function prepareSchoolInfo(schoolName: string): Promise<SchoolInfo> {
  return _loadSchool(schoolName)
}

function _ctx(info: DocHeaderInfo): HeaderCtx {
  const hit = _schoolCache.get(info.schoolName)
  const school: SchoolInfo = info.school
    ?? (hit?.s)
    ?? { officialName: info.schoolName }
  return {
    meta: {
      system:   'less',
      docTitle: info.title || DOC_TYPES[info.type]?.label || 'Documento',
      // Documento escolar tem o título centralizado; os outros sistemas seguem
      // à esquerda, que é o padrão do header compartilhado.
      docTitleAlign: 'center',
      // docSub omitido — o título já carrega o contexto ("Plano de Aula — semana de …")
      id:       `${info.type.toUpperCase()}-${info.createdAt.getFullYear()}-${_shortId(info.createdAt)}`,
      date:     info.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    },
    school,
  }
}

function _shortId(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const t = Math.floor(d.getTime() / 1000).toString(36).slice(-4).toUpperCase()
  return `${m}${day}-${t}`
}

// ── API preservada — os renderers (plano de aula, ata, guia) chamam essas
// funções e seguem escrevendo a partir de doc.y.
//
// O Y do corpo vem do PRÓPRIO header (é ele que sabe onde terminou de
// desenhar). Fixar um Y constante aqui fazia o corpo cair em cima do título
// e do mini-header.
function resetBodyStyle(doc: PDFDoc) {
  doc.font(FONT.regular).fontSize(SIZE.body).fillColor(COLORS.fg)
    .fillOpacity(1).strokeOpacity(1)
}

// `layout` permite que documentos de layout próprio (PEI, PDI, ATA) alinhem o
// cabeçalho institucional às suas margens, em vez das margens espelhadas.
export function fullHeader(doc: PDFDoc, info: DocHeaderInfo, layout: LayoutOpts = LESS_LAYOUT) {
  const ctx = _ctx(info)
  doc.y = renderFullHeader(doc, ctx, layout)
  resetBodyStyle(doc)
}

export function miniHeader(doc: PDFDoc, info: DocHeaderInfo, layout: LayoutOpts = LESS_LAYOUT) {
  const ctx = _ctx(info)
  doc.y = renderMiniHeader(doc, ctx, layout)
  resetBodyStyle(doc)
}

export function drawFooter(doc: PDFDoc, info: DocHeaderInfo, pageNum: number, totalPages: number) {
  const ctx = _ctx(info)
  sharedFooter(doc, ctx, pageNum, totalPages, LESS_LAYOUT)
}

export function paginate(doc: PDFDoc, info: DocHeaderInfo, layout: LayoutOpts = LESS_LAYOUT) {
  const ctx = _ctx(info)
  paginateAndFooter(doc, ctx, layout)
}
