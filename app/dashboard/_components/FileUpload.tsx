'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Upload, FileText, Image as ImageIcon, X, AlertCircle, Loader2 } from 'lucide-react'
import s from './file-upload.module.css'
import { IconButton } from '../_components/IconButton'

// FileUpload — dropzone unificada para <input type="file">.
//
// Features:
//  - drag & drop
//  - clique pra abrir file browser
//  - accept + maxSize com validação
//  - preview de imagem (opcional)
//  - multi-file
//  - compact: só um botão pequeno (sem dropzone)
//  - loading: mostra spinner
//  - remove file (X)
//
// Uso simples (single file):
//   <FileUpload accept="image/*" onFile={f => uploadPhoto(f)} maxSize={5*1024*1024} preview />
//
// Uso múltiplo:
//   <FileUpload multiple accept=".csv,.xlsx" onFiles={fs => importAll(fs)} />
//
// Uso compact (avatar):
//   <FileUpload compact accept="image/*" onFile={setAvatar} />

type BaseProps = {
  accept?:      string
  maxSize?:     number     // bytes
  disabled?:    boolean
  loading?:     boolean
  hint?:        string     // texto de dica (ex: "PNG, JPG até 5MB")
  label?:       string
  compact?:     boolean    // modo botão (sem dropzone)
  preview?:     boolean    // mostrar preview de imagem
  icon?:        ReactNode
  className?:   string
  buttonText?:  string     // padrão: "escolher arquivo"
}

type SingleProps = BaseProps & {
  multiple?: false
  onFile:    (file: File) => void
  onFiles?:  never
}

type MultiProps = BaseProps & {
  multiple: true
  onFiles:  (files: File[]) => void
  onFile?:  never
}

type Props = SingleProps | MultiProps

function formatSize(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

export function FileUpload(props: Props) {
  const {
    accept, maxSize, disabled, loading, hint, label,
    compact, preview, icon, className, buttonText = 'escolher arquivo',
  } = props

  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [files, setFiles]       = useState<File[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})

  const validate = useCallback((f: File): string | null => {
    if (maxSize && f.size > maxSize) {
      return `${f.name}: arquivo maior que ${formatSize(maxSize)}`
    }
    return null
  }, [maxSize])

  const handleFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return
    const arr = Array.from(list)
    for (const f of arr) {
      const err = validate(f)
      if (err) { setError(err); return }
    }
    setError(null)
    setFiles(arr)

    // Gerar previews para imagens
    if (preview) {
      const newPreviews: Record<string, string> = {}
      arr.forEach(f => {
        if (isImage(f)) newPreviews[f.name] = URL.createObjectURL(f)
      })
      setPreviews(newPreviews)
    }

    if (props.multiple) {
      props.onFiles(arr)
    } else if (arr[0]) {
      props.onFile(arr[0])
    }
  }, [validate, preview, props])

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (!disabled && !loading) setDragging(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (disabled || loading) return
    handleFiles(e.dataTransfer.files)
  }
  function openBrowser() {
    if (disabled || loading) return
    inputRef.current?.click()
  }
  function removeFile(idx: number) {
    const next = files.filter((_, i) => i !== idx)
    setFiles(next)
    if (files[idx]) {
      const url = previews[files[idx].name]
      if (url) URL.revokeObjectURL(url)
    }
  }

  const rootCls = [
    s.wrap,
    compact ? s.compact : s.dropzone,
    dragging ? s.dragging : '',
    disabled ? s.disabled : '',
    loading  ? s.loading  : '',
    error    ? s.error    : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  // ── Compact: só botão ────────────────────────────────
  if (compact) {
    return (
      <div className={s.compactWrap}>
        {label && <label className={s.label}>{label}</label>}
        <button
          type="button"
          className={rootCls}
          onClick={openBrowser}
          disabled={disabled || loading}
        >
          {loading ? (
            <Loader2 size={13} className={s.spin} />
          ) : icon ?? <Upload size={13} />}
          {buttonText}
        </button>
        <input
          ref={inputRef}
          type="file"
          className={s.hiddenInput}
          accept={accept}
          multiple={props.multiple}
          onChange={e => handleFiles(e.target.files)}
          disabled={disabled}
        />
        {error && (
          <span className={s.errorMsg}><AlertCircle size={11}/> {error}</span>
        )}
        {files.length > 0 && !error && (
          <div className={s.fileList}>
            {files.map((f, i) => (
              <div key={i} className={s.fileChip}>
                <FileText size={12} />
                <span className={s.fileName}>{f.name}</span>
                <IconButton
                  icon={<X size={11} />}
                  label="remover"
                  variant="danger"
                  onClick={() => removeFile(i)}
                  type="button"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Dropzone: card grande com drag & drop ────────────
  return (
    <div className={s.dropWrap}>
      {label && <label className={s.label}>{label}</label>}
      <div
        className={rootCls}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openBrowser}
        role="button"
        tabIndex={disabled || loading ? -1 : 0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openBrowser()}
      >
        <input
          ref={inputRef}
          type="file"
          className={s.hiddenInput}
          accept={accept}
          multiple={props.multiple}
          onChange={e => handleFiles(e.target.files)}
          disabled={disabled}
        />

        <div className={s.iconWrap}>
          {loading ? <Loader2 size={22} className={s.spin} /> : icon ?? <Upload size={22} />}
        </div>
        <div className={s.textBlock}>
          <span className={s.mainText}>
            {dragging ? 'solte para enviar' : loading ? 'enviando…' : (
              <>
                <strong>clique</strong> ou arraste
              </>
            )}
          </span>
          {hint && !dragging && !loading && (
            <span className={s.hint}>{hint}</span>
          )}
        </div>
      </div>

      {error && (
        <span className={s.errorMsg}><AlertCircle size={11}/> {error}</span>
      )}

      {files.length > 0 && !error && (
        <div className={s.fileList}>
          {files.map((f, i) => (
            <div key={i} className={s.fileRow}>
              {preview && previews[f.name] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[f.name]} alt={f.name} className={s.previewImg} />
              ) : (
                <span className={s.fileIcon}>
                  {isImage(f) ? <ImageIcon size={16}/> : <FileText size={16}/>}
                </span>
              )}
              <div className={s.fileInfo}>
                <span className={s.fileName}>{f.name}</span>
                <span className={s.fileSize}>{formatSize(f.size)}</span>
              </div>
              <IconButton
                icon={<X size={13} />}
                label="remover"
                variant="danger"
                onClick={() => removeFile(i)}
                type="button"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
