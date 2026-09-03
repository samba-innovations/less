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
  paginateAndFooter, setLogoDir, type HeaderCtx, type SchoolInfo,
} from '@pdf'
import { DOC_TYPES, type DocType } from '../doc-types'

// Aponta o loader pra pasta dos SVGs (bind mount do compose)
setLogoDir(process.env.PDF_LOGOS_DIR ?? '/app/pdf-logos')

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
const _schoolCache = new Map<string, SchoolInfo>()
async function _loadSchool(name: string): Promise<SchoolInfo> {
  if (_schoolCache.has(name)) return _schoolCache.get(name)!
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
  }).catch(() => null)
  const s: SchoolInfo = row ?? { officialName: name }
  if (!s.officialName) s.officialName = name
  _schoolCache.set(name, s)
  return s
}

// Ctx é construído sync na primeira chamada. Pra evitar await no meio do
// render, o consumidor pode chamar `prepareSchoolInfo(name)` antes.
export async function prepareSchoolInfo(schoolName: string): Promise<SchoolInfo> {
  return _loadSchool(schoolName)
}

function _ctx(info: DocHeaderInfo): HeaderCtx {
  const school: SchoolInfo = info.school
    ?? _schoolCache.get(info.schoolName)
    ?? { officialName: info.schoolName }
  return {
    meta: {
      system:   'less',
      docTitle: info.title || DOC_TYPES[info.type]?.label || 'Documento',
      docSub:   DOC_TYPES[info.type]?.label,
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

// ── API preservada ────────────────────────────────────────────────────────────
export function fullHeader(doc: PDFDoc, info: DocHeaderInfo) {
  const ctx = _ctx(info)
  renderFullHeader(doc, ctx)
}

export function miniHeader(doc: PDFDoc, info: DocHeaderInfo) {
  const ctx = _ctx(info)
  renderMiniHeader(doc, ctx)
}

export function drawFooter(doc: PDFDoc, info: DocHeaderInfo, pageNum: number, totalPages: number) {
  const ctx = _ctx(info)
  sharedFooter(doc, ctx, pageNum, totalPages)
}

export function paginate(doc: PDFDoc, info: DocHeaderInfo) {
  const ctx = _ctx(info)
  paginateAndFooter(doc, ctx)
}
