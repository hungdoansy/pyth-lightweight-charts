import { Button } from "@/components/ui/button"
import Spinner from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type LoadingAndErrorProps = {
    className?: string
    spinnerClassName?: string
    isLoading: boolean
    error?: Error | null
    onRetry?: () => void
}
export function LoadingAndError({
    isLoading,
    error,
    className,
    spinnerClassName,
    onRetry,
}: LoadingAndErrorProps) {
    if (!isLoading && !error) {
        return null
    }

    return (
        <div
            className={cn(
                "w-full h-full bg-[#474747]/10 rounded-lg flex-1 min-h-0 flex items-center justify-center text-sm",
                className
            )}
        >
            {error ? (
                <div className="flex flex-col items-center gap-2">
                    <span className="font-medium">{error.message || "Something went wrong"}</span>
                    {onRetry && <Button onClick={onRetry}>Retry</Button>}
                </div>
            ) : (
                <Spinner className={cn("flex-none w-9 h-9", spinnerClassName)} />
            )}
        </div>
    )
}
