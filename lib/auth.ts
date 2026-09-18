// Sessão: um lugar só pra descobrir quem está pedindo.
//
// O preâmbulo de autenticação estava escrito à mão no começo de cada página e
// de cada rota — ler o cookie, verificar o token, resolver a organização, a
// escola. Eram variações pequenas espalhadas por dezenas de arquivos, e uma
// correção de regra de acesso precisava ser repetida em todas elas (foi assim
// que a checagem do token de pré-autenticação passou batido nos middlewares).
//
// Duas famílias, porque o que fazer quando não há sessão é diferente:
//
//   • páginas (Server Components) — `exigir*` manda pro login e não volta;
//   • rotas de API — `sessaoApi`/`api*` devolvem a resposta pronta, porque
//     redirecionar um fetch não ajuda ninguém:
//
//       const s = await apiComEscola()
//       if (!s.ok) return s.resposta
//       const { payload, school } = s
//
// Papel (coordenação, professor, aluno…) continua na rota: é regra de negócio,
// e cada tela resolve de um jeito — umas bloqueiam, outras mostram outra coisa.

import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { getAuthCookie } from './cookie'
import { db } from './db'
import { verifyToken, type JwtPayload } from './jwt'
import { getSchoolFromPayload } from './school'

const login = () => `${process.env.NEXT_PUBLIC_SSO_URL ?? ''}/login`

// ── Papel atual, lido do banco ──────────────────────────────────────────────
// `role` e `isAdmin` viajam dentro do token, congelados no login — e o token
// vale um dia. Decidir permissão por eles significa que rebaixar alguém, tirar
// de uma escola ou desativar a conta só faz efeito no dia seguinte.
//
// Aqui o vínculo é RE-LIDO a cada requisição: o token diz QUEM é a pessoa, o
// banco diz o que ela pode agora. Lança quando o usuário sumiu, foi desativado
// ou perdeu o vínculo com a organização — quem chama trata como sessão inválida.
async function comPapelAtual(claims: JwtPayload): Promise<JwtPayload> {
  const user = await db.user.findUnique({
    where:  { id: claims.userId },
    select: {
      isActive: true,
      isAdmin:  true,
      orgRoles: {
        where:  { organization: { slug: claims.orgSlug } },
        select: { role: true },
        take:   1,
      },
    },
  })
  if (!user || !user.isActive) throw new Error('Usuário inativo ou inexistente')

  const papel = user.orgRoles[0]?.role
  if (!papel) {
    // Admin do ecossistema não tem vínculo de organização e segue passando.
    if (user.isAdmin) return { ...claims, isAdmin: true }
    throw new Error('Usuário sem vínculo ativo com esta organização')
  }
  return { ...claims, role: papel, isAdmin: user.isAdmin }
}

// ── Páginas ─────────────────────────────────────────────────────────────────
// Token vencido ou adulterado cai no login, e não numa tela de erro: várias
// páginas chamavam verifyToken sem try/catch e devolviam 500 quando o dia
// virava com a aba aberta.

export async function exigirSessao(): Promise<JwtPayload> {
  const token = await getAuthCookie()
  if (!token) redirect(login())
  try {
    return await comPapelAtual(await verifyToken(token))
  } catch {
    redirect(login())
  }
}

export async function exigirEscola() {
  const payload = await exigirSessao()
  const school = await getSchoolFromPayload(payload)
  if (!school) redirect(login())
  return { payload, school }
}

// ── Rotas de API ────────────────────────────────────────────────────────────

type Falha = { ok: false; resposta: NextResponse }

const falha = (error: string, status: number): Falha =>
  ({ ok: false, resposta: NextResponse.json({ error }, { status }) })

export async function sessaoApi(): Promise<{ ok: true; payload: JwtPayload } | Falha> {
  const token = await getAuthCookie()
  if (!token) return falha('Não autenticado', 401)
  try {
    return { ok: true, payload: await comPapelAtual(await verifyToken(token)) }
  } catch {
    return falha('Não autenticado', 401)
  }
}

export async function apiComEscola() {
  const s = await sessaoApi()
  if (!s.ok) return s
  const school = await getSchoolFromPayload(s.payload)
  if (!school) return falha('Sem escola vinculada', 403)
  return { ok: true as const, payload: s.payload, school }
}

// ── Server Actions ──────────────────────────────────────────────────────────
// Aqui a falta de sessão vira exceção: a action não navega, então redirecionar
// não adianta — o erro sobe pro cliente, que já sabe tratar falha de ação.

export async function acaoComSessao(): Promise<JwtPayload> {
  const s = await sessaoApi()
  if (!s.ok) throw new Error('Não autenticado')
  return s.payload
}

export async function acaoComEscola() {
  const s = await apiComEscola()
  if (!s.ok) throw new Error('Não autenticado')
  return { payload: s.payload, school: s.school }
}

// ── Nomes antigos ───────────────────────────────────────────────────────────
// Este arquivo já existia no less antes da padronização, com estes três nomes
// espalhados por 17 telas. Fica como apelido do que está acima — a verificação
// é a mesma — em vez de renomear tudo de uma vez.

export async function getSession(): Promise<JwtPayload | null> {
  const s = await sessaoApi()
  return s.ok ? s.payload : null
}
