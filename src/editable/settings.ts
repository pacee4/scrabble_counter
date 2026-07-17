import type { ResourcesToLoad } from "@/core/asset_loader";

export const settings: Readonly<{
    SCREEN_WIDTH: number,
    SCREEN_HEIGHT: number,
    MAX_LAYERS?: number
}>
= Object.freeze({
    SCREEN_WIDTH: 480,
    SCREEN_HEIGHT: 360
} as const)

export function getResourcesToLoad(): ResourcesToLoad {
    return {};
}