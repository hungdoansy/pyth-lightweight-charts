export type PropsWithClassName<T extends {} = {}> = {
    className?: string
} & T

export type MetaResponse<T = unknown> = {
    statusCode: number
    message?: string
    data?: T | null
    debug?: any
}

export type ExtractMetaResponse<M extends MetaResponse<any>> = M extends MetaResponse<infer T>
    ? T
    : never

export type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}
