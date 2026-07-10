'use client'

import { createContext, useContext, useState, useEffect, useMemo } from 'react'

type LabelMap = Record<string, string>

type SetterCtx = {
  setLabel: (segment: string, label: string) => void
  clear:    (segment: string) => void
}

const LabelsCtx = createContext<LabelMap>({})
const SetterContext = createContext<SetterCtx | null>(null)

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<LabelMap>({})

  const setter = useMemo<SetterCtx>(() => ({
    setLabel: (segment: string, label: string) => {
      setLabels(prev => (prev[segment] === label ? prev : { ...prev, [segment]: label }))
    },
    clear: (segment: string) => {
      setLabels(prev => {
        if (!(segment in prev)) return prev
        const next = { ...prev }; delete next[segment]; return next
      })
    },
  }), [])

  return (
    <SetterContext.Provider value={setter}>
      <LabelsCtx.Provider value={labels}>
        {children}
      </LabelsCtx.Provider>
    </SetterContext.Provider>
  )
}

export function useBreadcrumbLabels(): LabelMap {
  return useContext(LabelsCtx)
}

export function useRegisterBreadcrumb(segment: string | number | null | undefined, label: string | null | undefined) {
  const setter = useContext(SetterContext)
  useEffect(() => {
    if (!setter || segment == null || !label) return
    const seg = String(segment)
    setter.setLabel(seg, label)
    return () => setter.clear(seg)
  }, [setter, segment, label])
}
