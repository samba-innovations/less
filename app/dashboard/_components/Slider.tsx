'use client'

import { memo, useMemo } from 'react'
import s from './slider.module.css'

// Slider — substitui <input type="range">. Track colorido via
// CSS custom property `--pct`, thumb custom com hover/active.
// Suporta step, min/max, disabled, size, label opcional e
// exibição opcional do valor à direita (renderValue).

type Props = {
  value:        number
  onChange:     (v: number) => void
  min?:         number       // default 0
  max?:         number       // default 100
  step?:        number       // default 1
  disabled?:    boolean
  size?:        'sm' | 'md'
  label?:       string
  renderValue?: (v: number) => string   // ex: v => `${Math.round(v*100)}%`
  className?:   string
  ariaLabel?:   string
}

function SliderImpl({
  value, onChange, min = 0, max = 100, step = 1,
  disabled, size = 'md', label, renderValue, className, ariaLabel,
}: Props) {
  const pct = useMemo(() => {
    if (max === min) return 0
    return ((value - min) / (max - min)) * 100
  }, [value, min, max])

  const wrap = (
    <div
      className={`${s.wrap} ${size === 'sm' ? s.wrapSm : ''} ${disabled ? s.wrapDisabled : ''} ${className ?? ''}`}
    >
      <div className={s.trackWrap} style={{ '--pct': `${pct}%` } as React.CSSProperties}>
        <input
          type="range"
          className={s.input}
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          aria-label={ariaLabel ?? label}
        />
        <div className={s.trackBg} />
        <div className={s.trackFill} />
        <div className={s.thumb} />
      </div>
      {renderValue && (
        <span className={s.valueLabel}>{renderValue(value)}</span>
      )}
    </div>
  )

  if (!label) return wrap
  return (
    <div className={s.fieldWrap}>
      <label className={s.fieldLabel}>{label}</label>
      {wrap}
    </div>
  )
}

export const Slider = memo(SliderImpl)
