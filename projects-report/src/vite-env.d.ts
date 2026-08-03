/// <reference types="vite/client" />

declare module '*.pdf' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

interface ImportMetaEnv {
  readonly VITE_SCHEDULE_LINK?: string
  readonly VITE_SLACK_WEBHOOK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
