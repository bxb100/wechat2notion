import { WechatyBuilder } from 'wechaty'
import { Contact as ContactType } from 'wechaty-puppet/types'
import Qrterminal from 'qrcode-terminal'
import * as Sentry from '@sentry/node'

import * as message from './event/message'

// import { schedule } from './schedule'
import config from './config'

Sentry.init({
  dsn: config.sentryDsn
})

const bot = WechatyBuilder.build({
  name: 'wechat2notion',
  puppetOptions: {
    uos: true, // 开启uos协议
  },
  puppet: 'wechaty-puppet-wechat4u',
})

function handleScan(qrcode: string) {
  Qrterminal.generate(qrcode, {small: true})
}

bot
  .on('scan', handleScan)
  // .on('room-join', roomJoin.handleRoomJoin)
  // .on('friendship', friendShip.handleFriendShip)
  .on('message', message.handleMessage)
  .on('login', () => {
    console.log(bot.name(), '登录成功')
  })
  .on('error', (error) => {
    Sentry.captureException(error)
  })
  .start()
