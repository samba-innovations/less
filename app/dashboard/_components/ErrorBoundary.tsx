'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react'
import s from './error-boundary.module.css'

type Props = {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

type State = { hasError: boolean; error: Error | null }

// ErrorBoundary — wrapper que captura erros em runtime de qualquer descendente
// e exibe fallback em vez de crashear a app inteira. Ideal envolver o content
// do dashboard (mantém sidebar/topbar funcionando).
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
    this.props.onError?.(error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError || !this.state.error) return this.props.children
    if (this.props.fallback) return this.props.fallback(this.state.error, this.reset)
    return (
      <div className={s.wrap} role="alert">
        <div className={s.iconWrap}>
          <AlertTriangle size={32} strokeWidth={1.5} />
        </div>
        <div className={s.textBlock}>
          <h2 className={s.title}>algo deu errado</h2>
          <p className={s.description}>
            um problema inesperado impediu esta parte da página de carregar. já registramos o erro.
          </p>
          <details className={s.details}>
            <summary>detalhes técnicos</summary>
            <code className={s.errorMsg}>{this.state.error.message}</code>
          </details>
        </div>
        <div className={s.actions}>
          <button className="samba-btn-ghost" onClick={() => (typeof window !== 'undefined' && window.history.back())}>
            <ArrowLeft size={14}/> voltar
          </button>
          <button className="samba-btn-primary" onClick={this.reset}>
            <RotateCcw size={14}/> tentar de novo
          </button>
        </div>
      </div>
    )
  }
}
