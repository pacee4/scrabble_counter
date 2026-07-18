import * as F from "@/core/functions";
import * as C from "@/editable/custom";
import { m, messages, sf, sfR } from "@/core/sensing_properties";
import { g } from "@/editable/global_properties";

import { CompHitbox, CompMask, Sprite, type Ctx2D } from "@/core/base_classes";
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
    clickHitbox;

    constructor() {
        super(240, 180, gatheredAssets.images["green"]);
        this.setAnchorPoint(0.5, 0.5);
        this.clickHitbox = new CompHitbox(this, undefined, true);
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK:
                this.rotation = m.time*Math.PI/4;
                this.scaleTo(Math.sin(m.time*Math.PI)+2);

                if (this.clickHitbox.collidePoint(m.mouseX, m.mouseY)) {
                    this.opacity = 0.5;
                    window.debugTools?.setCustomValue([this.clickHitbox.offsetX, this.clickHitbox.offsetY]);
                }
                else {
                    this.opacity = 1;
                }
                break;
        }
    }
}