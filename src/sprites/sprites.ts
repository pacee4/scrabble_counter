import * as F from "@/core/functions";
import * as C from "@/editable/custom";
import { m, messages, sf, sfR } from "@/core/sensing_properties";
import { g } from "@/editable/global_properties";

import { Sprite, type Ctx2D } from "@/core/base_classes";
import { Msg } from "@/editable/msg";
import { settings } from "@/editable/settings";

import { s } from "./storage";
import { gatheredAssets } from "@/core/asset_loader";


export class SBackground extends Sprite {
    constructor() {
        super(0, 0);
    }

    drawResult(ctx: Ctx2D): void {
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, 0, sf(settings.SCREEN_WIDTH), sf(settings.SCREEN_HEIGHT));
    }
}

export class SGreen extends Sprite {
    constructor() {
        super(240, 180, gatheredAssets.subcanvasImages["green"]);
        this.setAnchorPoint(0.5, 0.5);
    }
}