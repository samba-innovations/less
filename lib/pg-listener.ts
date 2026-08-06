import { CONTAINER_ID, _deliverLocalUser, _deliverLocalSchool } from './sse-broadcaster'

// Listener dedicado do canal Postgres 'samba_notifications'.
// Cada container do ecossistema mantém uma conexão em LISTEN. Quando qualquer
// sistema chama pushToUser/pushToSchool, o pg_notify se propaga aqui e
// entregamos localmente aos SSE subscribers deste container.
//
// Dedup: o próprio container que originou o pg_notify recebe o eco. Se o
// envelope tem originator === CONTAINER_ID, skipamos (pra não entregar 2x).
//
// webpackIgnore: 'pg' fica como import nativo do Node, sem passar pelo
// bundle do webpack (que quebrava com pgpass/fs/path warnings em dev).

const CHANNEL = 'samba_notifications'
const RECONNECT_MS = 3000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null
let reconnectTimer: NodeJS.Timeout | null = null

type Envelope =
  | { kind: 'user';    originator: string; userId:   number; event: string; data: object }
  | { kind: 'school';  originator: string; schoolId: number; event: string; data: object }
  | { kind: 'message'; originator: string; threadId: number; senderId: number; participantIds: number[]; data: object }

async function connect() {
  if (client) return
  if (!process.env.DATABASE_URL) {
    console.warn('[pg-listener] DATABASE_URL não setada — cross-container notifications desligado')
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pg: any
  try {
    // @ts-ignore — 'pg' é import nativo do Node (sem @types/pg); tipado como any acima.
    pg = await import(/* webpackIgnore: true */ 'pg')
  } catch (e) {
    console.warn('[pg-listener] pg module não carregou:', (e as Error).message)
    return
  }
  const PgClient = pg.default?.Client ?? pg.Client

  const c = new PgClient({ connectionString: process.env.DATABASE_URL })

  try {
    await c.connect()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.on('notification', (msg: any) => {
      if (msg.channel !== CHANNEL || !msg.payload) return
      try {
        const p = JSON.parse(msg.payload) as Envelope
        if (p.originator === CONTAINER_ID) return
        if (p.kind === 'user') {
          const delivered = _deliverLocalUser(p.userId, p.event, p.data)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const notifId = (p.data as any)?.id
          if (delivered && typeof notifId === 'number') {
            void c.query('UPDATE "Notification" SET "deliveredAt" = COALESCE("deliveredAt", NOW()) WHERE id = $1', [notifId]).catch(() => {})
          }
        }
        if (p.kind === 'school') _deliverLocalSchool(p.schoolId, p.event, p.data)
        if (p.kind === 'message') {
          // Envia 'message' pra cada participante conectado a este container
          for (const uid of p.participantIds) _deliverLocalUser(uid, 'message', p.data)
        }
      } catch (e) {
        console.warn('[pg-listener] payload parse failed:', e)
      }
    })

    c.on('error', (err: Error) => {
      console.warn('[pg-listener] conexão erro:', err.message)
      client = null
      scheduleReconnect()
    })

    c.on('end', () => {
      console.warn('[pg-listener] conexão encerrada, reconectando')
      client = null
      scheduleReconnect()
    })

    await c.query(`LISTEN ${CHANNEL}`)
    client = c
    console.log(`[pg-listener] ativo em "${CHANNEL}" (container=${CONTAINER_ID.slice(0, 8)})`)
  } catch (e) {
    console.warn('[pg-listener] connect falhou:', (e as Error).message)
    scheduleReconnect()
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    void connect()
  }, RECONNECT_MS)
}

export function startNotificationListener() {
  void connect()
}
