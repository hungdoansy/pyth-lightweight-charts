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

type SinglePointData = {
    time: UTCTimestamp
    value: number
}

const channelToSubscription = new Map<
    string,
    {
        lastPoint: SinglePointData | null
        handlers: Array<(bar: SinglePointData) => void>
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

    let point: SinglePointData
    const lastPoint = subscriptionItem.lastPoint
    if (!lastPoint) {
        const currentTime = getCurrentTimeByResolution(tradeTime, resolution) as UTCTimestamp
        point = {
            time: currentTime,
            value: tradePrice,
        }
    } else {
        const nextPointTime = getNextTimeByResolution(lastPoint.time, resolution) as UTCTimestamp
        if (tradeTime >= nextPointTime) {
            point = {
                time: nextPointTime,
                value: tradePrice,
            }
        } else {
            point = {
                ...lastPoint,
                value: tradePrice,
            }
        }
    }

    subscriptionItem.lastPoint = point

    // Send data to every subscriber of that symbol
    subscriptionItem.handlers.forEach((handler) => {
        handler(point)
    })
    channelToSubscription.set(channelString, subscriptionItem)
}

type LineChartProps = {
    symbol: string
    timeFrame: string
}
export default function LineChart({ symbol, timeFrame }: LineChartProps) {
    const [isReady, setReady] = useState(false)
    const chartContainerRef = useRef<HTMLDivElement | null>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const lineSeriesRef = useRef<ISeriesApi<"Baseline"> | null>(null)

    const setChartData = useCallback(
        (data: ChartData[]) => {
            if (!data || !data.length) {
                return
            }

            lineSeriesRef.current?.setData(
                data.map((item) => ({
                    time: item.time,
                    value: item.close,
                }))
            )
            const latest = data.slice(-1)[0]

            const subscriptionItem = channelToSubscription.get(symbol)
            if (!subscriptionItem) {
                throw new Error("subscriptionItem")
            }
            channelToSubscription.set(symbol, {
                ...subscriptionItem,
                lastPoint: {
                    time: latest.time,
                    value: latest.close,
                },
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
            chartRef.current = createPriceChart(chartContainerRef.current)
            lineSeriesRef.current = chartRef.current.addBaselineSeries()

            chartRef.current
                .timeScale()
                .subscribeVisibleLogicalRangeChange(
                    handleChangeLogicalRange(setChartData, symbol, timeFrame)
                )

            lineSeriesRef.current.applyOptions({
                priceFormat: { type: "custom", minMove: 0.000000001, formatter: formatTokenPrice },
            })

            channelToSubscription.set(symbol, {
                lastPoint: null,
                handlers: [
                    (point: SinglePointData) => {
                        lineSeriesRef.current?.update(point)
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
