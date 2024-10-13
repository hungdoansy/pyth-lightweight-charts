export enum ChartTimeFrame {
    m1 = "1",
    m5 = "5",
    m15 = "15",
    h1 = "60",
    h4 = "240",
    d1 = "1D",
}

export const secondsByTimeFrame: Record<ChartTimeFrame, number> = {
    [ChartTimeFrame.m1]: 60,
    [ChartTimeFrame.m5]: 300,
    [ChartTimeFrame.m15]: 900,
    [ChartTimeFrame.h1]: 3600,
    [ChartTimeFrame.h4]: 14400,
    [ChartTimeFrame.d1]: 86400,
}

export enum ChartStyle {
    LINE = "line",
    CANDLES = "candles",
}
