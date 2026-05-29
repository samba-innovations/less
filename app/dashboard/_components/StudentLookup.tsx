'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { StudentProfileV2, type V2Student, type V2Occurrence, type V2OcrCategory } from './StudentProfileV2'

export function StudentLookup() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const [student, setStudent] = useState<V2Student | null>(null)
  const viewId = searchParams.get('view')

  const fetchStudent = useCallback(async (id: number) => {
    const res = await fetch(`/api/student/${id}`)
    if (!res.ok) return null
    return await res.json() as V2Student
  }, [])

  useEffect(() => {
    if (!viewId) { setStudent(null); return }
    const id = Number(viewId)
    if (!id || isNaN(id)) return
    fetchStudent(id).then(s => { if (s) setStudent(s) })
  }, [viewId, fetchStudent])

  function close() {
    setStudent(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('view')
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname)
  }

  if (!student) return null

  return (
    <StudentProfileV2
      student={student}
      schoolType="PUBLIC"
      canWrite={false}
      onClose={close}
      ocrFetcher={async () => {
        const r = await fetch(`/api/student/${student.id}/ocorrencias`)
        if (!r.ok) return { items: [], categories: [] }
        return await r.json() as { items: V2Occurrence[]; categories: V2OcrCategory[] }
      }}    />
  )
}