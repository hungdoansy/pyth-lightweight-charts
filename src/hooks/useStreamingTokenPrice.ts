import { produce } from "immer"
import throttle from "lodash/throttle"
import { useEffect } from "react"
import { create } from "zustand"

import { PAIR_OPTIONS } from "@/constants/pair"
import { Callback, streamingPriceService } from "@/lib/price"

type PriceData = {
    v: number
    t: number
}

type TokenPriceStoreState = {
    byPair: Record<string, PriceData>
    setTokenPrice: (pair: string, price: PriceData) => void
    getTokenPrice: (pair: string) => PriceData | undefined
}

export const useTokenPriceStore = create<TokenPriceStoreState>()((set, get) => ({
    byPair: {},
    setTokenPrice(pair, price) {
        set((state) =>
            produce(state, (draft) => {
                draft.byPair[pair] = price
            })
        )
    },
    getTokenPrice(pair) {
        return get().byPair[pair]
    },
}))

// each pair should have its own throttled function, otherwise
// only one pair's price is updated when values of multiple pairs come
const throttledSetFunctionByPair: Record<string, Callback> = {}

const generateThrottledSetFunction = (pair: string): Callback => {
    return throttle<Callback>(
        (price) => {
            useTokenPriceStore.getState().setTokenPrice(pair, {
                v: price.p,
                t: price.t,
            })
        },
        1_000,
        {
            leading: true,
            trailing: false,
        }
    )
}

// cache the throttled function
const getThrottledSetPrice = (pair: string) => {
    if (!throttledSetFunctionByPair[pair]) {
        throttledSetFunctionByPair[pair] = generateThrottledSetFunction(pair)
    }

    return throttledSetFunctionByPair[pair]
}

export function useGetTokenPrice(pair: string) {
    const tokenPriceData = useTokenPriceStore((state) => state.byPair[pair])

    useEffect(() => {
        const pairOption = PAIR_OPTIONS.find((p) => p.value === pair)
        if (!pairOption) {
            throw new Error("Invalid pair")
        }

        const setPriceCallback = getThrottledSetPrice(pair)
        const unsubscribe = streamingPriceService.subscribe(setPriceCallback, pairOption.pythSymbol)
        return () => {
            unsubscribe()
        }
    }, [pair])

    return tokenPriceData
}
