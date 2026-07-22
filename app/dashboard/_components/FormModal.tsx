'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Modal, ms } from './Modal'

type Props = {
  /** 'create' (mostra "novo X") ou 'edit' (mostra "editar X"). */
  mode:        'create' | 'edit'
  /** Nome do elemento singular, ex: "disciplina", "aluno". Usado em title e label do botão. */
  entityLabel: string
  /** Sobrescreve o título completo (caso queira algo diferente do padrão). */
  title?:      string
  /** Sobrescreve o subtítulo. Em edit, default = nome do item; em create, default = undefined. */
  subtitle?:   string
  /** Sobrescreve label do submit. Default: "salvar". */
  submitLabel?: string
  /** Sobrescreve label do botão durante submit. Default: "salvando...". */
  pendingLabel?: string
  /** Sobrescreve label do botão de cancelar. Default: "cancelar". */
  cancelLabel?: string
  /** Mostra a hint "* campos obrigatórios" automaticamente. Default: true. */
  showRequiredHint?: boolean
  size?:       'sm' | 'md' | 'lg'
  onClose:     () => void
  onSubmit:    () => void | Promise<void>
  /** Validação extra (além do `required` nos inputs) — retorne string com erro ou null. */
  validate?:   () => string | null
  /** Desabilita o submit por outras razões (ex: prerequisito não satisfeito). */
  submitDisabled?: boolean
  /** Conteúdo do form (fields). NÃO inclua o `<form>` nem os botões — o FormModal cuida disso. */
  children:    ReactNode
}

/**
 * Modal padronizado para create/edit. Resolve de uma vez:
 *  - `<form onSubmit>` envolvendo os fields (Enter submete)
 *  - footer com cancelar + submit consistente
 *  - estado pending automático ("salvando...")
 *  - erro inline (`ms.errorMsg`) limpo no submit e no close
 *  - hint "* campos obrigatórios" se houver fields obrigatórios
 *  - título padronizado: "novo X" / "editar X"
 *
 * Uso:
 *   <FormModal mode="create" entityLabel="disciplina" onClose={...} onSubmit={async () => {...}}>
 *     <div className={ms.field}>...</div>
 *   </FormModal>
 */
export function FormModal({
  mode, entityLabel,
  title, subtitle,
  submitLabel, pendingLabel = 'salvando...', cancelLabel = 'cancelar',
  showRequiredHint = true,
  size = 'sm',
  onClose, onSubmit, validate,
  submitDisabled = false,
  children,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error,     setError]        = useState<string | null>(null)

  const resolvedTitle = title ?? (mode === 'create' ? `novo ${entityLabel}` : `editar ${entityLabel}`)
  const resolvedSubmitLabel = submitLabel ?? 'salvar'

  function handleClose() {
    if (isPending) return
    setError(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitDisabled || isPending) return
    setError(null)

    if (validate) {
      const v = validate()
      if (v) { setError(v); return }
    }

    startTransition(async () => {
      try {
        await onSubmit()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.')
      }
    })
  }

  return (
    <Modal title={resolvedTitle} subtitle={subtitle} onClose={handleClose} size={size}>
      <form onSubmit={handleSubmit} className={ms.form} noValidate={false}>
        {error && <p className={ms.errorMsg}>{error}</p>}

        {children}

        {showRequiredHint && (
          <p className={ms.requiredHint}>* campos obrigatórios</p>
        )}

        <div className={ms.formActions}>
          <button type="button" className={ms.btnSecondary} onClick={handleClose} disabled={isPending}>
            {cancelLabel}
          </button>
          <button type="submit" className={ms.btnPrimary} disabled={isPending || submitDisabled}>
            <Check size={14} /> {isPending ? pendingLabel : resolvedSubmitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export { ms }
