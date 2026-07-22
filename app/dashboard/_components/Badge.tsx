/**
 * Badge unificado pro less.
 *
 * Exemplos:
 *   <Badge tone="success">final</Badge>
 *   <Badge tone="amber" withDot pulse>ao vivo</Badge>
 *   <Badge tone="violet" variant="solid" icon={<Lock size={9} />}>coord</Badge>
 *   <Badge tone="brand" variant="outline" onRemove={() => ...}>tag</Badge>
 *
 * Tones: neutral | brand | success | amber | rose | teal | violet | blue
 * Variants: soft (default) | solid | outline
 * Sizes: xs | sm (default) | md
 *
 * Recursos visuais inclusos:
 * - Animação de entrada (fade + slight scale-in)
 * - Hover lift sutil
 * - Pulso opcional no dot (status "ao vivo")
 * - Botão de remover com animação
 */

'use client'

import type { CSSProperties, ReactNode } from 'react'
import { X } from 'lucide-react'
import s from './badge.module.css'
import { IconButton } from '../_components/IconButton'

type Tone = 'neutral' | 'brand' | 'success' | 'amber' | 'rose' | 'teal' | 'violet' | 'blue'
type Variant = 'soft' | 'solid' | 'outline'
type Size = 'xs' | 'sm' | 'md'

type Props = {
  children:   ReactNode
  tone?:      Tone
  variant?:   Variant
  size?:      Size
  /** Mostra um pontinho colorido (estilo status "Active"). */
  withDot?:   boolean
  /** Pulsa o dot (use pra estados "ao vivo" / "em uso agora"). */
  pulse?:     boolean
  /** Icon prefix (ex: <Lock size={9} />). */
  icon?:      ReactNode
  /** Marca como counter (números — usa tabular-nums). */
  counter?:   boolean
  /** Torna clicável (cursor + active scale). */
  onClick?:   () => void
  /** Mostra botão de fechar/remover (tags removíveis). */
  onRemove?:  () => void
  title?:     string
  className?: string
  style?:     CSSProperties
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: s.toneNeutral,
  brand:   s.toneBrand,
  success: s.toneSuccess,
  amber:   s.toneAmber,
  rose:    s.toneRose,
  teal:    s.toneTeal,
  violet:  s.toneViolet,
  blue:    s.toneBlue,
}

const SIZE_CLASS: Record<Size, string> = {
  xs: s.sizeXs,
  sm: s.sizeSm,
  md: s.sizeMd,
}

export function Badge({
  children, tone = 'neutral', variant = 'soft', size = 'sm',
  withDot, pulse, icon, counter,
  onClick, onRemove, title, className, style,
}: Props) {
  const Tag = onClick ? 'button' : 'span'
  const classes = [
    s.badge,
    TONE_CLASS[tone],
    SIZE_CLASS[size],
    variant === 'solid'   ? s.solid   : '',
    variant === 'outline' ? s.outline : '',
    counter ? s.counter : '',
    onClick ? s.clickable : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <Tag
      className={classes}
      style={style}
      title={title}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {withDot && <span className={`${s.dot} ${pulse ? s.dotPulse : ''}`} aria-hidden />}
      {icon && <span className={s.icon} aria-hidden>{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <IconButton
          icon={<X size={9} strokeWidth={2.5} />}
          label="remover"
          variant="danger"
          onClick={e => { e.stopPropagation(); onRemove() }}
          type="button"
        />
      )}
    </Tag>
  )
}
