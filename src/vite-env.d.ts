/// <reference types="vite/client" />

declare const __BUILD_TIME__: string

interface ImportMetaEnv {
    // more variables here...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
