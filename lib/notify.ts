import { db } from './db'
import { pushToUser } from './sse-broadcaster'

type NotifyParams = {
  userId:         number
  organizationId: number
  type:           string
  title:          string
  body:           string
  link?:          string
  system?:        string
}

export async function notify(params: NotifyParams) {
  const notification = await db.notification.create({ data: params })
  pushToUser(params.userId, 'notification', notification)
  return notification
}
