// Registro de erro de runtime, agrupado por impressão digital.
//
// Escreve via SQL cru de propósito: assim nenhum sistema precisa declarar o
// model AppError no próprio schema.prisma. A tabela mora no db/ (fonte da
// verdade) e o painel admin é quem lê.
//
// O agrupamento é o ponto: mil ocorrências do mesmo defeito viram uma linha com
// count = 1000. Sem isso, um erro em laço de render afogaria a tabela.
import { db } from './db'

const SYSTEM = 'less'

/** Primeira linha útil do stack — o suficiente para separar defeitos distintos. */
function topOfStack(stack?: string | null): string | null {
  if (!stack) return null
  const linha = stack.split(/\r?\n/).find(l => l.trim().startsWith('at '))
  return linha ? linha.trim().slice(0, 300) : null
}

/**
 * Web Crypto, e não createHash do node: este módulo é alcançado pelo
 * instrumentation.ts, que o Next compila também para o runtime edge — onde
 * `crypto` do node não resolve e derruba o build inteiro.
 */
async function fingerprint(message: string, stackTop: string | null): Promise<string> {
  const bruto  = [SYSTEM, message, stackTop ?? ''].join('|')
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(bruto))
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

export type ErrorReport = {
  message:  string
  stack?:   string | null
  path?:    string | null
  origin?:  'client' | 'server'
  userId?:  number | null
  orgSlug?: string | null
}

/**
 * Nunca lança: um erro ao registrar erro não pode derrubar a requisição que já
 * estava com problema.
 */
export async function reportError(r: ErrorReport): Promise<void> {
  try {
    const message  = String(r.message ?? '').slice(0, 500) || 'erro sem mensagem'
    const stackTop = topOfStack(r.stack)
    const fp       = await fingerprint(message, stackTop)

    await db.$executeRaw`
      INSERT INTO "AppError" (
        "fingerprint", "system", "message", "stackTop", "path", "origin",
        "lastUserId", "lastOrgSlug"
      )
      VALUES (
        ${fp}, ${SYSTEM}, ${message}, ${stackTop}, ${r.path ?? null}, ${r.origin ?? 'server'},
        ${r.userId ?? null}, ${r.orgSlug ?? null}
      )
      ON CONFLICT ("fingerprint") DO UPDATE SET
        "count"       = "AppError"."count" + 1,
        "lastSeenAt"  = CURRENT_TIMESTAMP,
        "path"        = COALESCE(EXCLUDED."path", "AppError"."path"),
        "lastUserId"  = COALESCE(EXCLUDED."lastUserId", "AppError"."lastUserId"),
        "lastOrgSlug" = COALESCE(EXCLUDED."lastOrgSlug", "AppError"."lastOrgSlug"),
        -- Erro que volta depois de resolvido reabre: regressão precisa aparecer.
        "resolvedAt"  = NULL
    `
  } catch (e) {
    console.error('[report-error] falhou ao registrar', e)
  }
}
