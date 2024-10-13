import { PAIR_OPTIONS } from "@/constants/pair"

export type StreamingPriceData = {
    id: string
    p: number
    t: number
}

const supportedChannels = PAIR_OPTIONS.map((p) => p.pythSymbol)
const CHANNEL_ALL = "channel_all"
const noob = () => {
    // empty
}
export type Callback = (data: StreamingPriceData) => void
export class StreamingPriceService {
    private subscribers: Map<string /** pythSymbol */, Set<Callback>> = new Map()
    private numberOfSubscribers = 0

    private isAttemptingConnection: boolean = false
    private isConnected: boolean = false
    private retryCount: number = 0
    private maxRetries: number = 5

    private async connect(): Promise<void> {
        if (this.isAttemptingConnection || this.isConnected) {
            return
        }

        const attemptConnection = () => {
            const controller = new AbortController()
            const signal = controller.signal

            fetch("https://benchmarks.pyth.network/v1/shims/tradingview/streaming", { signal })
                .then((response) => {
                    if (!response.body) {
                        console.error("[stream] No response body")
                        return
                    }

                    this.isConnected = true
                    this.isAttemptingConnection = false
                    this.retryCount = 0

                    const reader = response.body.getReader()

                    function cancelStream() {
                        reader
                            .cancel()
                            .then(() => {
                                console.log("[stream] Streaming cancelled.")
                            })
                            .catch((error) => {
                                console.error("[stream] Error cancelling stream: ", error)
                            })

                        // Abort the fetch request
                        controller.abort()
                    }

                    const streamData = () => {
                        if (!this.isConnected) {
                            cancelStream()
                            return
                        }

                        reader
                            .read()
                            .then(({ value, done }) => {
                                if (done) {
                                    console.error("[stream] Streaming ended.")
                                    return
                                }

                                // Assuming the streaming data is separated by line breaks
                                const dataStrings = new TextDecoder().decode(value).split("\n")
                                dataStrings.forEach((dataString) => {
                                    const trimmedDataString = dataString.trim()
                                    if (trimmedDataString) {
                                        try {
                                            const jsonData = JSON.parse(trimmedDataString) as {
                                                id: string
                                                p: number
                                                t: number
                                            }

                                            this.sendData(jsonData)
                                        } catch (e) {
                                            const error = e as Error
                                            // ...
                                        }
                                    }
                                })

                                streamData() // Continue processing the stream
                            })
                            .catch((error) => {
                                console.error("[stream] Error reading from stream:", error)
                            })
                    }

                    streamData()
                })
                .catch((error) => {
                    console.error("[stream] Error fetching from the streaming endpoint: ", error)

                    if (this.retryCount < this.maxRetries) {
                        this.retryCount += 1
                        console.log(
                            `[stream] Retrying connection (${this.retryCount}/${this.maxRetries})...`
                        )
                        attemptConnection()
                    } else {
                        console.log("[stream] Max retries reached. Could not establish connection.")
                        this.retryCount = 0
                    }
                })
        }

        this.isAttemptingConnection = true
        attemptConnection()
    }

    private disconnect() {
        if (this.isConnected) {
            this.isConnected = false
            this.isAttemptingConnection = false
            this.retryCount = 0
            console.log("[stream] Connection closed.")
        }
    }

    subscribe(callback: Callback, channel?: string): () => void {
        if (typeof channel === "string" && !supportedChannels.includes(channel)) {
            throw new Error("[stream] invalid channel to subscribe")
        }

        channel = channel || CHANNEL_ALL

        if (!this.subscribers.has(channel)) {
            this.subscribers.set(channel, new Set())
        }

        const channelSubscribers = this.subscribers.get(channel)!

        if (channelSubscribers.has(callback)) {
            // already subscribed
            return noob
        }

        channelSubscribers.add(callback)
        this.numberOfSubscribers += 1

        if (this.numberOfSubscribers === 1) {
            this.connect()
        }

        return () => {
            channelSubscribers.delete(callback)
            this.numberOfSubscribers -= 1

            if (this.numberOfSubscribers === 0) {
                this.disconnect()
            }
        }
    }

    sendData(data: StreamingPriceData) {
        if (this.isConnected) {
            const channel = data.id
            const subscribers = this.subscribers.get(channel)
            const subscribesToAll = this.subscribers.get(CHANNEL_ALL)

            subscribers?.forEach((callback) => {
                callback(data)
            })

            subscribesToAll?.forEach((callback) => {
                callback(data)
            })
        }
    }
}

export const streamingPriceService = new StreamingPriceService()
