/* ================================================================================
  Glitch example: https://glitch.com/edit/#!/notion-github-sync
  Find the official Notion API client @ https://github.com/makenotion/notion-sdk-js/
================================================================================ */


import { Client } from "@notionhq/client";
import config from './../config'
import { Message, Room } from "wechaty";
import { Operator } from "opendal";
import { Message as MessageType } from 'wechaty-puppet/types'

const notion = new Client({auth: config.notionKey})
const r2 = new Operator("s3", {
  endpoint: config.r2API,
  bucket: config.r2Bucket,
  region: "auto",
  access_key_id: config.r2KeyId,
  secret_access_key: config.r2Key,
  root: "/"
})

const databaseId = config.notionDatabaseId

/**
 * Creates new pages in Notion.
 *
 * https://developers.notion.com/reference/post-page
 *
 */
export async function createPages(props: any) {
  await notion.pages.create({
    // @ts-ignore
    parent: {database_id: databaseId}, properties: props,
  })
}

//*========================================================================
// Helpers
//*========================================================================

const map = new Map<string, string>();

/**
 * Returns the Message to conform to this database's schema properties.
 *
 */
export async function getPropertiesFromMsg(msg: Message, room: Room) {
  const from = msg.talker()
  let alias: string | undefined
  if (map.has(from.id)) {
    alias = map.get(from.id) || ""
  } else {
    // TODO: 频率过高会导致 not found at async WechatifiedUserClass.alias
    alias = await room?.alias(from)
    map.set(from.id, alias)
  }
  const sendDate = msg.date()
  let content = msg.text()
  let message = {text: {content: content}}
  let attach = undefined
  if (msg.type() === MessageType.Url) {
    const urlLink = await msg.toUrlLink()
    message = {
      text: {
        content: urlLink.title(), // @ts-ignore
        link: {
          url: urlLink.url()
        }
      }, href: urlLink.url()
    }
  }
  if (msg.type() === MessageType.Image || msg.type() == MessageType.Video || msg.type() === MessageType.Audio || msg.type() === MessageType.Attachment) {
    const file = await msg.toFileBox()
    await r2.write(`${ file.name }`, await file.toBuffer())
    message = {text: {content: `用户上传了 ${ MessageType[msg.type()] }`}}
    attach = {
      "Attach": {
        files: [
          {
            external: {
              url: `https://r2.tomcat.run/${ file.name }`,
            },
            name: file.name
          }
        ]
      }
    }
  }
  if (msg.type() === MessageType.Emoticon) {
    const file = await msg.toFileBox()
    message = {text: {content: `表情: ${ file.name }`}}
  }
  if (msg.type() === MessageType.Text) {
    // extract URL from the <a> Tag
    content = content.replace(/<a .+?>([^<]+)<\/a>/g, "$1")
    // extract emoji from the <img> Tag
    content = content.replace(/<img class="qqemoji \w+" text="(\[.+?])_web".+?\/>/g, "$1")
    content = content.replace(/<img class="qqemoji \w+" text="(\[.+?])_web".+?\/>/g, "$1")
    content = content.replace(/<br\/>/g, "\n")
    message = {text: {content: content}}
  }

  return {
    "From": {
      title: [{type: "text", text: {content: from.name()}}],
    }, "Alias": {
      rich_text: [{text: {content: alias || ""}}]
    }, "Message": {
      rich_text: [message]
    }, "Date": {
      date: {start: sendDate.toISOString()},
    },
    "Message ID": {
      rich_text: [{text: {content: msg.id}}]
    },
    ...attach
  }
}
