import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={cn('animate-pulse rounded-lg bg-slate-200/60', className)} />
    );
}

/** Full-width card skeleton with optional rows */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="card p-5 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} style={{ width: `${85 - i * 10}%` }}>
                    <Skeleton className="h-3 w-full" />
                </div>
            ))}
        </div>
    );
}

/** KPI stat card skeleton */
export function StatSkeleton() {
    return (
        <div className="card p-5 flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
    );
}

/** Table skeleton */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/70">
                <Skeleton className="h-5 w-40" />
            </div>
            <div className="divide-y divide-white/40">
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} className="px-5 py-3 flex gap-4">
                        {Array.from({ length: cols }).map((_, c) => (
                            <Skeleton key={c} className="h-3 flex-1" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Page-level skeleton: title + stats + content */
export function PageSkeleton() {
    return (
        <div className="page">
            <div className="mb-8 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
            </div>
            <TableSkeleton />
        </div>
    );
}
