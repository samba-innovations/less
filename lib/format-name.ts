// format-name — normaliza nomes de pessoas seguindo convenção do português.
//
// Regras:
//  - Cada palavra tem primeira letra maiúscula, restante minúscula
//  - EXCEÇÕES (lowercase): partículas comuns dos nomes brasileiros
//    da, de, di, do, du, das, dos, e
//  - EXCEÇÃO à exceção: primeira palavra SEMPRE capitalizada
//    (ex: "de souza" → "De Souza", mas "maria de souza" → "Maria de Souza")
//  - Preserva grafias com apóstrofos: "d'Angelo" → "d'Angelo"
//  - Remove espaços duplicados e trim
//
// Exemplos:
//   "marcos afonso"       → "Marcos Afonso"
//   "MARIA DE OLIVEIRA"   → "Maria de Oliveira"
//   "joao dos santos"     → "João dos Santos"
//   "PEDRO E ANA COSTA"   → "Pedro e Ana Costa"
//   "  ana  clara  "      → "Ana Clara"

const LOWERCASE_PARTICLES = new Set([
  'da', 'de', 'di', 'do', 'du',
  'das', 'dos',
  'e', 'y',
  // Estrangeiros comuns
  'del', 'della', 'delle', 'la', 'le', 'van', 'von',
])

function capitalizeWord(word: string): string {
  if (!word) return word
  // Trata apóstrofos: d'Angelo, O'Brien
  if (word.includes("'")) {
    return word
      .split("'")
      .map((seg, i) => {
        if (i === 0) return capitalizeWord(seg)
        // Depois do apóstrofo mantém primeira letra maiúscula
        return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase()
      })
      .join("'")
  }
  // Hífen (ex: Ana-Maria)
  if (word.includes('-')) {
    return word
      .split('-')
      .map(seg => capitalizeWord(seg))
      .join('-')
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * Formata um nome de pessoa seguindo as regras do português brasileiro.
 * Retorna string vazia se input for null/undefined.
 */
export function formatName(name: string | null | undefined): string {
  if (!name) return ''
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''

  const words = trimmed.split(' ')
  return words
    .map((word, i) => {
      const lower = word.toLowerCase()
      // Primeira palavra sempre capitalizada
      if (i === 0) return capitalizeWord(word)
      // Partículas ficam minúsculas quando NÃO são a primeira palavra
      if (LOWERCASE_PARTICLES.has(lower)) return lower
      return capitalizeWord(word)
    })
    .join(' ')
}

/**
 * Extrai iniciais formatadas de um nome (usado no Avatar fallback).
 * "marcos afonso" → "MA"
 * "maria de oliveira" → "MO" (pula partículas)
 */
export function initialsFromName(name: string | null | undefined): string {
  if (!name) return '?'
  const formatted = formatName(name).trim()
  if (!formatted) return '?'
  const words = formatted.split(' ').filter(w => !LOWERCASE_PARTICLES.has(w.toLowerCase()))
  if (words.length === 0) return '?'
  if (words.length === 1) return (words[0][0] ?? '?').toUpperCase()
  const first = words[0][0] ?? ''
  const last  = words[words.length - 1][0] ?? ''
  return (first + last).toUpperCase()
}
