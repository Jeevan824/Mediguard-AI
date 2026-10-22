"use client";

export default function Footer() {
    return (
        <footer className="relative border-t border-white/5 py-12 px-6">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">M</span>
                    </div>
                    <span
                        className="text-sm font-bold tracking-tight"
                        style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
                    >
                        MindGuard<span className="text-indigo-400">.ai</span>
                    </span>
                </div>

                <p className="text-xs text-gray-500 text-center">
                    An Intelligent System to Detect Mental Overload and Improve Human Performance in Real Time using AI & ML
                </p>

                <p className="text-xs text-gray-600">
                    © {new Date().getFullYear()} MindGuard AI. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
