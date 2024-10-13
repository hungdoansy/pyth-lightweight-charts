import { LogicalRange, UTCTimestamp, createChart } from "lightweight-charts"
import { throttle } from "lodash"
import zipWith from "lodash/zipWith"

import { publicClient } from "@/configs/httpClient"
import { formatTokenPrice } from "@/lib/formatter"
import { now } from "@/lib/time"
import { ChartData } from "@/types/chart"

const resolutionMap: Record<string, number> = {
    "1": 60,
    "2": 120,
    "5": 300,
    "15": 900,
    "30": 1800,
    "60": 3600,
    "120": 7200,
    "240": 14400,
    "360": 21600,
    "720": 43200,
    D: 86400,
    "1D": 86400,
    W: 604_800,
    "1W": 604_800,
}

type FetchHistoricalResponse = {
    o: number[]
    c: number[]
    h: number[]
    l: number[]
    s: "ok" | string
    t: number[]
    v: number[]
}

export async function fetchHistorical(
    channel: string,
    resolution = "1",
    numberOfResults = 200
): Promise<ChartData[]> {
    const resp = await publicClient.get<FetchHistoricalResponse>(
        "https://benchmarks.pyth.network/v1/shims/tradingview/history",
        {
            params: {
                symbol: channel,
                resolution,
                from: now() - numberOfResults * resolutionMap[resolution],
                to: now(),
            },
        }
    )

    const data = resp.data
    if (!data) {
        throw new Error("failed to fetch historical price")
    }

    const { o, c, h, l, t } = data
    return zipWith(o, c, h, l, t, (open, close, high, low, time) => ({
        open,
        close,
        high,
        low,
        time: time as UTCTimestamp,
    }))
}

export function getNextTimeByResolution(time: number, resolution: string) {
    const base = resolutionMap[resolution]
    const next = Math.floor(time / base) * base + base
    return next
}

export function getCurrentTimeByResolution(time: number, resolution: string) {
    const base = resolutionMap[resolution]
    const current = Math.floor(time / base) * base
    return current
}

export function createPriceChart(element: HTMLElement) {
    const priceChart = createChart(element, {
        width: element.clientWidth,
        height: 500,
        autoSize: true,
        layout: {
            background: {
                color: "#161616",
            },
            textColor: "#b3b5be",
        },
        grid: {
            vertLines: {
                color: "#20242f",
            },
            horzLines: {
                color: "#20242f",
            },
        },
        rightPriceScale: {
            borderColor: "#20242f",
            entireTextOnly: true,
            minimumWidth: 40,
        },
        timeScale: {
            borderColor: "#20242f",
            timeVisible: true,
        },
    })

    priceChart.applyOptions({
        localization: {
            priceFormatter: formatTokenPrice,
        },
    })

    return priceChart
}

export function handleChangeLogicalRange(
    callback: (data: ChartData[]) => void,
    symbol: string,
    timeFrame: string
) {
    let controller: AbortController | null = null
    let count = 400

    const throttledFetch = throttle(
        async () => {
            if (controller) {
                controller.abort() // Cancel the previous request
            }

            controller = new AbortController() // Create a new abort controller
            try {
                const data = await fetchHistorical(symbol, timeFrame, count)
                count += 200
                callback(data)
            } catch (e) {
                const error = e as Error
                if (error.name === "AbortError") {
                    console.log("Fetch cancelled")
                } else {
                    console.error("Fetch error:", error)
                }
            }
        },
        1_000,
        {
            leading: true,
        }
    )

    return (logicalRange: LogicalRange | null) => {
        if (!logicalRange) {
            return
        }

        if (logicalRange.from >= 10) {
            return
        }

        throttledFetch()
    }
}
