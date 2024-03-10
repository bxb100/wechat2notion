import { Message, Sayable } from 'wechaty'
import config from "../config";

type Route = {
  handle: ((text: string, msg: Message) => Sayable) | ((text: string, msg: Message) => Promise<Sayable>)
  keyword: string | RegExp
  filter?: (msg: Message) => boolean | Promise<boolean>
}

export const routes: Route[] = [
  {
    keyword: '/notion',
    handle() {
      return config.notionSharePage
    },
  }
]
