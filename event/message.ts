import { Message } from 'wechaty'
import { Message as MessageType } from 'wechaty-puppet/types'
import { routes } from '../message'
import { createPages, getPropertiesFromMsg } from "../notion/job";
import config from "../config";
import { AsyncBlockingQueue } from "../notion/queue";

const blockQueue = new AsyncBlockingQueue()
setInterval(async () => {
  if (blockQueue.isEmpty()) {
    return
  }
  // 1 秒钟处理 20 条数据
  let count = 20
  while (!blockQueue.isEmpty() && count > 0) {
    const data = await blockQueue.dequeue()
    await createPages(data)
    count--
  }
}, 1000)

// 默认只回复私聊，以及艾特我的群聊
async function defaultFilter(msg: Message) {
  const mentionSelf = await msg.mentionSelf()
  return (
    msg.type() === MessageType.Text &&
    (!msg.room() || (msg.room() && mentionSelf))
  )
}

const createdAt = Date.now()
export async function handleMessage(msg: Message) {
  if (msg.type() === MessageType.Unknown || msg.type() === MessageType.Recalled) {
    console.debug('Unknown message type ' + msg)
    return
  }

  const room = msg.room()
  let topic = null
  if (!(topic = await room?.topic())) {
    return
  }

  // AI增长黑客团
  if (topic === config.monitorWechatGroup) {
    // 将信息打包发送到 notion 中
    if (msg.type() !== MessageType.Unknown && msg.type() !== MessageType.Recalled) {
      blockQueue.enqueue(await getPropertiesFromMsg(msg, room))
    }
  }

  // 如果是过时的消息，则不理睬
  if (msg.date().getTime() < createdAt) {
    return
  }
  // 如果是自己发的消息，则不理睬
  if (msg.talker().self()) {
    return
  }
  const enable = await defaultFilter(msg)
  if (!enable) {
    return
  }

  const self = msg.listener()
  const text = msg.text().replace('@' + self?.name(), '') || ''
  const route = routes.find((route) => {
    const keyword = route.keyword
    if (typeof keyword === 'string') {
      return text.includes(keyword)
    }
    return keyword.test(text)
  })
  const filter = await (route.filter || defaultFilter)(msg)
  if (!filter || !route) {
    return
  }
  const data = await route.handle(text, msg)
  await msg.say(data)
}
