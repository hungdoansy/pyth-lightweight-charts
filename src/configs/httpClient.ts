import { appEnv } from "@/env"
import axios, { AxiosInstance } from "axios"

interface AxiosConfig {
    baseURL?: string
    timeout?: number
    headers?: Record<string, string>
}

const DEFAULT_TIMEOUT = 1000 * 60 // 1 minute

const createPublicHttpClient = (config: AxiosConfig): AxiosInstance => {
    const instance = axios.create({
        baseURL: config.baseURL,
        timeout: config.timeout || DEFAULT_TIMEOUT,
        headers: config.headers || {},
    })
    return instance
}

export const publicClient = createPublicHttpClient({
    baseURL: appEnv.API_URL,
})
