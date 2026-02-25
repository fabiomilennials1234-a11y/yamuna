
export default function Loading() {
    return (
        <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-4">
                <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                </div>
                <p className="animate-pulse text-sm font-medium text-slate-400">Carregando dados...</p>
            </div>
        </div>
    );
}
