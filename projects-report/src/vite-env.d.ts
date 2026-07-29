/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCHEDULE_LINK?: string
  readonly VITE_SLACK_WEBHOOK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
