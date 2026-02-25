"use client";

/**
 * Dashboard Skeleton - Loading State
 * Shows while dashboard data is being fetched
 */
export function DashboardSkeleton() {
    return (
        <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
            {/* Filter Badge Skeleton */}
            <div className="flex items-center gap-2 -mt-4 mb-6">
                <span className="flex h-2 w-2 rounded-full bg-slate-700 animate-pulse"></span>
                <div className="h-6 w-64 bg-slate-800 rounded-full animate-pulse"></div>
            </div>

            {/* KPI Sections Skeleton */}
            <div className="space-y-10">
                {/* Section 1: Investment */}
                <section>
                    <div className="flex items-center gap-2 mb-4 ml-1">
                        <div className="p-1.5 rounded-lg bg-slate-800 w-8 h-8 animate-pulse"></div>
                        <div className="h-4 w-48 bg-slate-800 rounded animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                </section>

                {/* Section 2: Sales */}
                <section>
                    <div className="flex items-center gap-2 mb-4 ml-1">
                        <div className="p-1.5 rounded-lg bg-slate-800 w-8 h-8 animate-pulse"></div>
                        <div className="h-4 w-32 bg-slate-800 rounded animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                </section>

                {/* Section 3: Customers */}
                <section>
                    <div className="flex items-center gap-2 mb-4 ml-1">
                        <div className="p-1.5 rounded-lg bg-slate-800 w-8 h-8 animate-pulse"></div>
                        <div className="h-4 w-24 bg-slate-800 rounded animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                </section>

                {/* Section 4: Growth */}
                <section>
                    <div className="flex items-center gap-2 mb-4 ml-1">
                        <div className="p-1.5 rounded-lg bg-slate-800 w-8 h-8 animate-pulse"></div>
                        <div className="h-4 w-40 bg-slate-800 rounded animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                </section>
            </div>

            {/* Bottom Section Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-4">
                <div className="xl:col-span-2 min-h-[400px] bg-slate-900/50 border border-slate-800 rounded-xl p-6 animate-pulse">
                    <div className="h-6 w-32 bg-slate-800 rounded mb-6"></div>
                    <div className="flex items-center justify-center h-full">
                        <div className="h-64 w-full bg-slate-800 rounded"></div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 animate-pulse">
                        <div className="h-6 w-40 bg-slate-800 rounded mb-4"></div>
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-800 rounded-lg">
                                <div className="h-4 w-24 bg-slate-700 rounded mb-2"></div>
                                <div className="h-8 w-32 bg-slate-700 rounded"></div>
                            </div>
                            <div className="p-4 bg-slate-800 rounded-lg">
                                <div className="h-4 w-24 bg-slate-700 rounded mb-2"></div>
                                <div className="h-8 w-32 bg-slate-700 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 h-[120px] flex flex-col justify-between animate-pulse">
            <div className="h-3 w-24 bg-slate-800 rounded"></div>
            <div className="h-8 w-32 bg-slate-800 rounded"></div>
        </div>
    );
}
