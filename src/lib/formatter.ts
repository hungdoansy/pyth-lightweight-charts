const DEFAULT_LOCALE = "en-US"
const DEFAULT_LOCAL_CURRENCY = "USD"
const LOCAL_CURRENCY_SYMBOL_DISPLAY_TYPE = "narrowSymbol"

type Nullish<T> = T | null | undefined
type NumberFormatOptions = Intl.NumberFormatOptions

const TWO_DECIMALS: NumberFormatOptions = {
    notation: "standard",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
}

const FOUR_DECIMALS: NumberFormatOptions = {
    notation: "standard",
    maximumFractionDigits: 4,
    minimumFractionDigits: 4,
}

const SIX_DECIMALS: NumberFormatOptions = {
    notation: "standard",
    maximumFractionDigits: 6,
    minimumFractionDigits: 6,
}

const MAX_FOUR_DECIMALS: NumberFormatOptions = {
    notation: "standard",
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
}
const MAX_TEN_DECIMALS: NumberFormatOptions = {
    notation: "standard",
    maximumFractionDigits: 10,
    minimumFractionDigits: 0,
}

const SHORTHAND_TWO_DECIMALS: NumberFormatOptions = {
    notation: "compact",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}

// each rule must contain either an `upperBound` or an `exact` value.
// upperBound => number will use that formatter as long as it is < upperBound
// exact => number will use that formatter if it is === exact
// if hardcodedinput is supplied it will override the input value or use the hardcoded output
type HardCodedInputFormat =
    | {
          input: number
          prefix?: string
          hardcodedOutput?: undefined
      }
    | {
          input?: undefined
          prefix?: undefined
          hardcodedOutput: string
      }

type FormatterBaseRule = { formatterOptions: NumberFormatOptions }
type FormatterExactRule = { upperBound?: undefined; exact: number } & FormatterBaseRule
type FormatterUpperBoundRule = { upperBound: number; exact?: undefined } & FormatterBaseRule

type FormatterRule = (FormatterExactRule | FormatterUpperBoundRule) & {
    hardCodedInput?: HardCodedInputFormat
}

const tokenPriceFormatter: FormatterRule[] = [
    { exact: 0, formatterOptions: TWO_DECIMALS },
    { upperBound: 0.1, formatterOptions: MAX_FOUR_DECIMALS },
    { upperBound: 1.05, formatterOptions: FOUR_DECIMALS },
    { upperBound: 1e3, formatterOptions: FOUR_DECIMALS },
    { upperBound: 1e5, formatterOptions: TWO_DECIMALS },
    { upperBound: 1e6, formatterOptions: TWO_DECIMALS },
    { upperBound: Infinity, formatterOptions: SHORTHAND_TWO_DECIMALS },
]

export enum NumberType {
    TokenPrice = "token-price",
}

type FormatterType = NumberType | FormatterRule[]
const TYPE_TO_FORMATTER_RULES = {
    [NumberType.TokenPrice]: tokenPriceFormatter,
}

function getFormatterRule(
    input: number,
    type: FormatterType,
    conversionRate?: number
): FormatterRule {
    const rules = Array.isArray(type) ? type : TYPE_TO_FORMATTER_RULES[type]
    for (const rule of rules) {
        const shouldConvertInput = rule.formatterOptions.currency && conversionRate
        const convertedInput = shouldConvertInput ? input * conversionRate : input

        if (
            (rule.exact !== undefined && convertedInput === rule.exact) ||
            (rule.upperBound !== undefined && convertedInput < rule.upperBound)
        ) {
            return rule
        }
    }

    throw new Error(`formatter for type ${type} not configured correctly for value ${input}`)
}

interface FormatNumberOptions {
    number: Nullish<number>
    type?: FormatterType
    placeholder?: string
    locale?: typeof DEFAULT_LOCALE
    localCurrency?: typeof DEFAULT_LOCAL_CURRENCY
}
function formatNumber({
    number,
    type = NumberType.TokenPrice,
    placeholder = "-",
    locale = DEFAULT_LOCALE,
    localCurrency = DEFAULT_LOCAL_CURRENCY,
}: FormatNumberOptions): string {
    if (number === null || number === undefined) {
        return placeholder
    }

    const { hardCodedInput, formatterOptions } = getFormatterRule(number, type)

    if (formatterOptions.currency) {
        formatterOptions.currency = localCurrency
        formatterOptions.currencyDisplay = LOCAL_CURRENCY_SYMBOL_DISPLAY_TYPE
    }

    if (!hardCodedInput) {
        return new Intl.NumberFormat(locale, formatterOptions).format(number)
    }

    if (hardCodedInput.hardcodedOutput) {
        return hardCodedInput.hardcodedOutput
    }

    const { input: hardCodedInputValue, prefix } = hardCodedInput
    if (hardCodedInputValue === undefined) return placeholder
    return (
        (prefix ?? "") + new Intl.NumberFormat(locale, formatterOptions).format(hardCodedInputValue)
    )
}

function getSign(num: number | undefined, force = false) {
    if (!num && num !== 0) {
        return ""
    }

    if (num === 0) {
        return force ? "+" : ""
    }

    if (num > 0) {
        return "+"
    }

    return ""
}

function formatTokenPrice(input: number | string): string {
    const inputAsNumber = Number(input)
    const sign = inputAsNumber < 0 ? "-" : ""

    const num = Math.abs(inputAsNumber)

    if (num === 0) {
        return "0.00"
    }

    if (num < 0.1) {
        const result = _formatSmallTokenPrice(num)
        return sign + result
    }

    const result = formatNumber({
        number: num,
        type: NumberType.TokenPrice,
    })

    return sign + result
}

function _formatSmallTokenPrice(value: number): string {
    const str = new Intl.NumberFormat(DEFAULT_LOCALE, MAX_TEN_DECIMALS).format(value)
    const regex = /^0\.(0+)(\d+)$/
    const match = str.match(regex)

    if (match) {
        const zeroCount = match[1].length
        const afterZero = _formatAfterZero(match[2])
        if (zeroCount >= 4) {
            return `0.0${_formatWithSubscript(String(zeroCount))}${afterZero}`
        }

        return `0.${match[1]}${afterZero}`
    }

    return str
}

function _formatAfterZero(afterZero: string) {
    const num = Number(`0.${afterZero}`)
    return new Intl.NumberFormat(DEFAULT_LOCALE, SIX_DECIMALS).format(num).slice(2)
}

const charToSubscript: Record<string, string> = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
}
function _formatWithSubscript(str: string) {
    return [...str].map((char) => charToSubscript[char]).join("")
}

export { formatNumber, getSign, formatTokenPrice }
