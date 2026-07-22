// formatDate — formatação consistente de datas com timezone-awareness.
// Usa Intl.DateTimeFormat pra respeitar locale e timezone do user.
// Fallback pra 'America/Sao_Paulo' se não configurado.

const DEFAULT_TZ = 'America/Sao_Paulo'
const DEFAULT_LOCALE = 'pt-BR'

function getUserTz(): string {
  if (typeof window === 'undefined') return DEFAULT_TZ
  return localStorage.getItem('samba-timezone') ?? DEFAULT_TZ
}

type DateInput = string | number | Date

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input)
}

export function formatDate(input: DateInput, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
    timeZone: getUserTz(),
    ...opts,
  }).format(toDate(input))
}

export function formatDateTime(input: DateInput) {
  return formatDate(input, {
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatTime(input: DateInput) {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: '2-digit', minute: '2-digit',
    timeZone: getUserTz(),
  }).format(toDate(input))
}

export function formatDateLong(input: DateInput) {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    timeZone: getUserTz(),
  }).format(toDate(input))
}

export function formatRelative(input: DateInput) {
  const now = Date.now()
  const then = toDate(input).getTime()
  const diff = now - then
  const sec = Math.floor(diff / 1000)
  if (sec < 60)   return 'agora'
  const min = Math.floor(sec / 60)
  if (min < 60)   return `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24)     return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 7)      return `${d}d atrás`
  return formatDate(input)
}

export function setUserTimezone(tz: string) {
  if (typeof window !== 'undefined') localStorage.setItem('samba-timezone', tz)
}

export function getUserTimezone(): string {
  return getUserTz()
}
