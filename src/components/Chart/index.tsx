import { useState } from "react"

import { LoadingAndError } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { ChartStyle, ChartTimeFrame } from "@/constants/chart"
import { PAIR_OPTIONS } from "@/constants/pair"

import CandlesChart from "./CandlesChart"
import LineChart from "./LineChart"

const labelByTimeFrame: Record<ChartTimeFrame, string> = {
    [ChartTimeFrame.m1]: "1m",
    [ChartTimeFrame.m5]: "5m",
    [ChartTimeFrame.m15]: "15m",
    [ChartTimeFrame.h1]: "1h",
    [ChartTimeFrame.h4]: "4h",
    [ChartTimeFrame.d1]: "1D",
}

export default function Chart() {
    const [pair, setPair] = useState(PAIR_OPTIONS[0])
    const [timeFrame, setTimeFrame] = useState(ChartTimeFrame.m1)
    const [style, setStyle] = useState(ChartStyle.CANDLES)

    return (
        <div className="flex flex-col items-center gap-4 pt-8 px-4">
            <div className="flex-none w-full h-max flex flex-col gap-4">
                <div className="w-full h-[420px] flex-none overflow-hidden rounded-lg border">
                    {pair ? (
                        style === ChartStyle.CANDLES ? (
                            <CandlesChart
                                key={timeFrame + pair.pythSymbol}
                                timeFrame={timeFrame}
                                symbol={pair.pythSymbol}
                            />
                        ) : (
                            <LineChart
                                key={timeFrame + pair.pythSymbol}
                                timeFrame={timeFrame}
                                symbol={pair.pythSymbol}
                            />
                        )
                    ) : (
                        <LoadingAndError isLoading />
                    )}
                </div>

                <div className="w-full flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <span>Symbol: </span>
                        <img
                            src={pair.logoURI}
                            width={24}
                            height={24}
                            className="w-6 h-auto flex-none"
                        />{" "}
                        {pair.label}
                    </div>
                    <div className="w-full flex flex-wrap items-center gap-2">
                        {PAIR_OPTIONS.map((option) => {
                            return (
                                <Button
                                    key={option.value}
                                    variant="outline"
                                    onClick={() => {
                                        setPair(option)
                                    }}
                                >
                                    {option.label}
                                </Button>
                            )
                        })}
                    </div>
                </div>

                <div className="w-full flex flex-col gap-1">
                    <span>Timeframe: {timeFrame}</span>
                    <div className="w-full flex items-center gap-2">
                        {Object.values(ChartTimeFrame).map((tf) => {
                            return (
                                <Button
                                    key={tf}
                                    variant="outline"
                                    onClick={() => {
                                        setTimeFrame(tf)
                                    }}
                                >
                                    {labelByTimeFrame[tf]}
                                </Button>
                            )
                        })}
                    </div>
                </div>

                <div className="w-full flex flex-col gap-1">
                    <span>Style: {style}</span>
                    <div className="w-full flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setStyle(ChartStyle.CANDLES)
                            }}
                        >
                            {ChartStyle.CANDLES}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setStyle(ChartStyle.LINE)
                            }}
                        >
                            {ChartStyle.LINE}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
