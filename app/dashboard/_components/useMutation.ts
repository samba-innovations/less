'use client'

import { useCallback, useState } from 'react'

// useMutation — hook simples pra chamadas POST/PATCH/DELETE.
// Retorna { mutate, isPending, error, data, reset }.
//
// Uso:
//   const { mutate, isPending, error } = useMutation<Payload, Response>('/api/alunos', 'POST')
//   <button disabled={isPending} onClick={() => mutate({ name: '...' })}>criar</button>

type Method = 'POST' | 'PATCH' | 'PUT' | 'DELETE'

type State<T> = {
  isPending: boolean
  error:     Error | null
  data:      T | null
}

export function useMutation<TInput = unknown, TOutput = unknown>(
  url: string | ((input: TInput) => string),
  method: Method = 'POST',
) {
  const [state, setState] = useState<State<TOutput>>({ isPending: false, error: null, data: null })

  const mutate = useCallback(async (input?: TInput): Promise<TOutput | null> => {
    setState({ isPending: true, error: null, data: null })
    try {
      const finalUrl = typeof url === 'function' ? url(input as TInput) : url
      const res = await fetch(finalUrl, {
        method,
        headers: input && method !== 'DELETE' ? { 'Content-Type': 'application/json' } : undefined,
        body:    input && method !== 'DELETE' ? JSON.stringify(input) : undefined,
      })
      const data = res.headers.get('Content-Type')?.includes('application/json')
        ? await res.json()
        : (await res.text()) as unknown

      if (!res.ok) {
        const message = (data && typeof data === 'object' && 'error' in data)
          ? String((data as { error: string }).error)
          : `HTTP ${res.status}`
        throw new Error(message)
      }
      setState({ isPending: false, error: null, data: data as TOutput })
      return data as TOutput
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      setState({ isPending: false, error, data: null })
      return null
    }
  }, [url, method])

  const reset = useCallback(() => {
    setState({ isPending: false, error: null, data: null })
  }, [])

  return {
    mutate,
    isPending: state.isPending,
    error:     state.error,
    data:      state.data,
    reset,
  }
}
