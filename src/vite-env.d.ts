/// <reference types="vite/client" />
import type { DebugTools } from "@/debug_tools";

declare global {
    interface Window {
        loadingError: boolean;
        loadingEventListeners: Record<string, any> | null;
        removeLoadingEventListeners: (()=>void) | null;

        /** Инструменты для отладки при разработке */
        debugTools?: DebugTools;
    }
}