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
  endpoint: config.r2S3API,
  bucket: config.r2Name,
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
export async function createPages(msg: Message, room: Room) {
  await notion.pages.create({
    // @ts-ignore
    parent: {database_id: databaseId}, properties: await getPropertiesFromMsg(msg, room),
  })
}


//*========================================================================
// Helpers
//*========================================================================

/**
 * Returns the Message to conform to this database's schema properties.
 *
 */
async function getPropertiesFromMsg(msg: Message, room: Room) {
  const from = msg.talker()
  const alias = await room?.alias(from)
  const sendDate = msg.date()
  let content = msg.text()
  let message = {text: {content: content}}
  let attach = undefined
  // MessageType.Url
  if (msg.type() === 14) {
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
  // MessageType.Image
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

  return {
    "From": {
      title: [{type: "text", text: {content: from.name()}}],
    }, "Alias": {
      rich_text: [{text: {content: alias || ""}}]
    }, "Message": {
      rich_text: [message]
    }, "Date": {
      date: {start: sendDate.toISOString(), time_zone: "Asia/Shanghai"},
    }, ...attach
  }
}
