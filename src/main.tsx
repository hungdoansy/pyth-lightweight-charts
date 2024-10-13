import dayjs from "dayjs"
import advancedFormat from "dayjs/plugin/advancedFormat"
import duration from "dayjs/plugin/duration"
import localizedFormat from "dayjs/plugin/localizedFormat"
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import Chart from "@/components/Chart"

import "./index.css"

dayjs.extend(advancedFormat)
dayjs.extend(localizedFormat)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Chart />
    </StrictMode>
)
;(() => {
    console.log(`Build time: %c${new Date(Number(__BUILD_TIME__))}`, "color: #bada55")
})()
