import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function repeatList<T>(list: T[], times: number): T[] {
    if (times < 0) {
        throw new Error("Number of repetitions must be non-negative.")
    }

    let result: T[] = []

    for (let i = 0; i < times; i++) {
        result = result.concat(list)
    }

    return result
}

export function sleep(ms = 5000) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

type SortCriteria<T> = [keyof T, "ASC" | "DESC"]
export function multiSort<T>(data: T[], sortCriteria?: SortCriteria<T>[]): T[] {
    if (!sortCriteria?.length) {
        return data
    }

    return [...data].sort((a, b) => {
        for (const [key, dir] of sortCriteria) {
            const isDesc = dir === "DESC"

            if (a[key] < b[key]) return isDesc ? 1 : -1
            if (a[key] > b[key]) return isDesc ? -1 : 1
        }

        return 0
    })
}
