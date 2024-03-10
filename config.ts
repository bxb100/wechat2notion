export default {
  sentryDsn: process.env.SENTRY_DSN,

  logger: true,

  monitorWechatGroup: process.env.WECHAT_GROUP,

  notionKey: process.env.NOTION_KEY,
  notionDatabaseId: process.env.NOTION_DATABASE_ID,
  notionShareLink: process.env.NOTION_SHARE_LINK,

  r2Bucket: process.env.R2_BUCKET,
  r2API: process.env.R2_API,
  r2KeyId: process.env.R2_KEY_ID,
  r2Key: process.env.R2_KEY,
}
