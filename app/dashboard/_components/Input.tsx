'use client'

import { forwardRef } from 'react'
import s from './input.module.css'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?:  string
  size?:  'md' | 'sm'
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
  hint?:  string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, size = 'md', className, ...props }, ref
) {
  return (
    <div className={s.wrap}>
      {label && <label className={s.label}>{label}</label>}
      <input
        ref={ref}
        className={[
          s.input,
          size === 'sm' ? s.inputSm : '',
          error ? s.inputError : '',
          className ?? '',
        ].join(' ')}
        {...props}
      />
      {error && <span className={s.error}>{error}</span>}
      {!error && hint && <span className={s.hint}>{hint}</span>}
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, ...props }, ref
) {
  return (
    <div className={s.wrap}>
      {label && <label className={s.label}>{label}</label>}
      <textarea
        ref={ref}
        className={[
          s.input,
          s.textarea,
          error ? s.inputError : '',
          className ?? '',
        ].join(' ')}
        {...props}
      />
      {error && <span className={s.error}>{error}</span>}
      {!error && hint && <span className={s.hint}>{hint}</span>}
    </div>
  )
})
