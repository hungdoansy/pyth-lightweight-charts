import { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts"
import { useCallback, useEffect, useRef, useState } from "react"

import { LoadingAndError } from "@/components/loading"
import { formatTokenPrice } from "@/lib/formatter"
import { StreamingPriceData, streamingPriceService } from "@/lib/price"
import { ChartData } from "@/types/chart"

import {
    createPriceChart,
    fetchHistorical,
    getCurrentTimeByResolution,
    getNextTimeByResolution,
    handleChangeLogicalRange,
} from "./utils"

type SingleBarData = {
    time: UTCTimestamp
    open: number
    high: number
    low: number
    close: number
}

const channelToSubscription = new Map<
    string,
    {
        lastBar: SingleBarData | null
        handlers: Array<(bar: SingleBarData) => void>
    }
>()

function handleStreamingData(data: StreamingPriceData, resolution: string) {
    const { id, p, t } = data

    const tradePrice = p
    const tradeTime = t // Multiplying by 1000 to get milliseconds

    const channelString = id
    const subscriptionItem = channelToSubscription.get(channelString)

    if (!subscriptionItem) {
        return
    }

    let bar: SingleBarData
    const lastBar = subscriptionItem.lastBar
    if (!lastBar) {
        const currentTime = getCurrentTimeByResolution(tradeTime, resolution) as UTCTimestamp
        bar = {
            time: currentTime,
            open: tradePrice,
            high: tradePrice,
            low: tradePrice,
            close: tradePrice,
        }
    } else {
        const nextBarTime = getNextTimeByResolution(lastBar.time, resolution) as UTCTimestamp
        if (tradeTime >= nextBarTime) {
            bar = {
                time: nextBarTime,

                open: tradePrice,
                high: tradePrice,
                low: tradePrice,
                close: tradePrice,
            }
            // console.log("[stream] Generate new bar", bar)
        } else {
            bar = {
                ...lastBar,
                high: Math.max(lastBar.high, tradePrice),
                low: Math.min(lastBar.low, tradePrice),
                close: tradePrice,
            }
            // console.log("[stream] Update the latest bar by price", tradePrice)
        }
    }

    subscriptionItem.lastBar = bar

    // Send data to every subscriber of that symbol
    subscriptionItem.handlers.forEach((handler) => {
        handler(bar)
    })
    channelToSubscription.set(channelString, subscriptionItem)
}

type CandlesChartProps = {
    symbol: string
    timeFrame: string
}
export default function CandlesChart({ symbol, timeFrame }: CandlesChartProps) {
    const [isReady, setReady] = useState(false)
    const chartContainerRef = useRef<HTMLDivElement | null>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)

    const setChartData = useCallback(
        (data: ChartData[]) => {
            if (!data || !data.length) {
                return
            }

            candleSeriesRef.current?.setData(data)
            const latest = data.slice(-1)[0]

            const subscriptionItem = channelToSubscription.get(symbol)
            if (!subscriptionItem) {
                throw new Error("subscriptionItem")
            }
            channelToSubscription.set(symbol, {
                ...subscriptionItem,
                lastBar: latest,
            })
        },
        [symbol]
    )

    const initData = useCallback(
        async (channel: string, resolution: string) => {
            const data = await fetchHistorical(channel, resolution)
            if (!data || !data.length) {
                return
            }

            setChartData(data)
            setReady(true)
            const unsubscribe = streamingPriceService.subscribe((data) => {
                handleStreamingData(data, resolution)
            }, channel)

            return unsubscribe
        },
        [setChartData]
    )

    useEffect(() => {
        if (chartContainerRef.current) {
            // Create chart instance using lightweight-charts directly
            chartRef.current = createPriceChart(chartContainerRef.current)
            candleSeriesRef.current = chartRef.current.addCandlestickSeries()

            chartRef.current
                .timeScale()
                .subscribeVisibleLogicalRangeChange(
                    handleChangeLogicalRange(setChartData, symbol, timeFrame)
                )

            candleSeriesRef.current.applyOptions({
                priceFormat: { type: "custom", minMove: 0.000000001, formatter: formatTokenPrice },
            })

            channelToSubscription.set(symbol, {
                lastBar: null,
                handlers: [
                    (bar: SingleBarData) => {
                        candleSeriesRef.current?.update(bar)
                    },
                ],
            })

            // Resize chart on window resize
            const handleResize = () => {
                chartRef.current?.resize(chartContainerRef.current!.clientWidth, 500)
            }
            window.addEventListener("resize", handleResize)

            let stopSubscription: (() => void) | undefined
            let isMounted = true
            const init = async () => {
                stopSubscription = await initData(symbol, timeFrame)
                if (!isMounted) {
                    stopSubscription?.()
                }
            }
            init()

            return () => {
                window.removeEventListener("resize", handleResize)
                chartRef.current?.remove()
                isMounted = false
                stopSubscription?.()
            }
        }
    }, [symbol, initData, timeFrame, setChartData])

    return (
        <div className="w-full h-full relative">
            <div ref={chartContainerRef} className="w-full h-full relative z-1" />
            {isReady || (
                <LoadingAndError
                    isLoading
                    className="absolute top-0 right-0 w-full h-full z-10 bg-[#161616]"
                />
            )}
        </div>
    )
}
