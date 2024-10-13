import { UTCTimestamp } from "lightweight-charts"

export type ChartData = {
    open: number
    close: number
    high: number
    low: number
    time: UTCTimestamp
}
