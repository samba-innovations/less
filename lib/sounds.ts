type SoundId = 'control' | 'gate' | 'occurrences' | 'reserves' | 'less' | 'update'

type Note = {
  freq:     number
  start:    number
  duration: number
  type?:    OscillatorType
  gain?:    number
}

function synthesize(notes: Note[]) {
  if (typeof window === 'undefined') return
  // Respeita prefs de som salvas em /dashboard/preferencias.
  // Se user desligou, não toca. Volume 0-1 multiplica o gain de cada nota.
  try {
    const soundOn = localStorage.getItem('samba-notif-sound')
    if (soundOn === '0') return
  } catch { /* SSR / storage bloqueado — segue normal */ }
  const volMult = (() => {
    try {
      const v = localStorage.getItem('samba-notif-volume')
      return v === null ? 1 : Number(v) / 0.5 // 0.5 é o "padrão" que representa gain original
    } catch { return 1 }
  })()
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    let maxEnd = 0
    for (const note of notes) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = note.type ?? 'sine'
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start)
      const t = ctx.currentTime + note.start
      const g = Math.min(1, Math.max(0, (note.gain ?? 0.28) * volMult))
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(g, t + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + note.duration)
      maxEnd = Math.max(maxEnd, note.start + note.duration)
    }
    setTimeout(() => ctx.close(), (maxEnd + 0.15) * 1000)
  } catch {}
}

const SOUNDS: Record<SoundId, Note[]> = {
  // dois sinos ascendentes — limpo, administrativo
  control: [
    { freq: 1047, start: 0,    duration: 0.28 },
    { freq: 1319, start: 0.14, duration: 0.28 },
  ],
  // bipe eletrônico rápido — portaria / acesso
  gate: [
    { freq: 880,  start: 0,    duration: 0.06, type: 'triangle' },
    { freq: 1100, start: 0.08, duration: 0.06, type: 'triangle' },
  ],
  // três notas descendentes — alerta de ocorrência
  occurrences: [
    { freq: 660, start: 0,   duration: 0.09 },
    { freq: 550, start: 0.1, duration: 0.09 },
    { freq: 440, start: 0.2, duration: 0.13 },
  ],
  // sino suave com harmônico — reserva/calendário
  reserves: [
    { freq: 523, start: 0, duration: 0.32, gain: 0.22 },
    { freq: 659, start: 0, duration: 0.32, gain: 0.10 },
  ],
  // dois sinos brilhantes — documentos/educação
  less: [
    { freq: 784,  start: 0,    duration: 0.20 },
    { freq: 1047, start: 0.16, duration: 0.20 },
  ],
  // toque sutil para atualização em tempo real
  update: [
    { freq: 660, start: 0, duration: 0.07, gain: 0.10 },
  ],
}

export function playSound(id: SoundId) {
  synthesize(SOUNDS[id] ?? [])
}
