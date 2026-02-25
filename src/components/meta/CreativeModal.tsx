import { createPortal } from "react-dom";
import { X, Play } from "lucide-react";
import { useEffect, useState } from "react";

interface CreativeModalProps {
    isOpen: boolean;
    onClose: () => void;
    creative: {
        name: string;
        imageUrl?: string;
        videoUrl?: string;
        embedHtml?: string;
        type: 'image' | 'video';
        body?: string;
        title?: string;
    } | null;
}

export function CreativeModal({ isOpen, onClose, creative }: CreativeModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!mounted || !isOpen || !creative) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur rounded-t-2xl">
                    <h3 className="text-lg font-bold text-white truncate pr-8">
                        {creative.name}
                    </h3>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900">
                    {creative.type === "video" ? (
                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center shadow-lg border border-slate-800">
                            {creative.videoUrl ? (
                                <video
                                    src={creative.videoUrl}
                                    controls
                                    className="w-full h-full"
                                    poster={creative.imageUrl}
                                />
                            ) : creative.embedHtml ? (
                                <div
                                    className="w-full h-full flex items-center justify-center [&>iframe]:w-full [&>iframe]:h-full"
                                    dangerouslySetInnerHTML={{ __html: creative.embedHtml }}
                                />
                            ) : (
                                <div className="text-center p-8">
                                    <div className="mb-4 flex justify-center">
                                        {creative.imageUrl && (
                                            <img
                                                src={creative.imageUrl}
                                                alt={creative.name}
                                                className="max-h-[200px] w-auto rounded opacity-50 object-contain"
                                                referrerPolicy="no-referrer"
                                            />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
                                        <Play className="w-12 h-12 text-slate-600 mb-2" />
                                        <p className="text-slate-400 text-sm text-center">
                                            Visualização de vídeo indisponível via API.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : creative.imageUrl ? (
                        <div className="relative w-full flex justify-center bg-black/20 rounded-xl p-2 border border-slate-800/50">
                            <img
                                src={creative.imageUrl}
                                alt={creative.name}
                                className="max-w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-sm"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64 bg-slate-800/50 rounded-lg border border-slate-800 border-dashed">
                            <p className="text-slate-400">Nenhuma mídia disponível</p>
                        </div>
                    )}

                    {/* Ad Copy / Text Section */}
                    {(creative.title || creative.body) && (
                        <div className="mt-6 space-y-3">
                            {creative.title && (
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                                    <h4 className="text-white font-semibold text-sm uppercase tracking-wider text-slate-500 mb-1">Título</h4>
                                    <p className="text-white text-lg leading-tight">{creative.title}</p>
                                </div>
                            )}
                            {creative.body && (
                                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                                    <h4 className="text-white font-semibold text-sm uppercase tracking-wider text-slate-500 mb-2">Texto Principal</h4>
                                    <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                        {creative.body}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between rounded-b-2xl">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${creative.type === 'video'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                            {creative.type === 'video' ? 'VIDEO' : 'IMAGEM'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
