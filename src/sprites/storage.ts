import { type Ctx2D, type Sprite } from "@/core/base_classes";
import { messages } from "@/core/sensing_properties";
import { settings } from "@/editable/settings";

import { Main } from "@/sprites/sprite_main";
import { SBackground, SGreen } from "./sprites";

// SPRITE STORAGE
type SpriteOrArray = Sprite | Array<Sprite>;
export class SpriteStorage {
    //#region 
    main = new Main();
    background = new SBackground();
    green = new SGreen();

    //#endregion

    /**
     * Add objects to the logic and drawing order (EDITABLE).
     * 
     * The order in which sprites are added to this collection
     * is the order in which their logic is executed in the
     * `messageStep` method and they are drawn in the `draw()` method. The lower
     * a sprite is added, the closer to the screen layer it will be displayed.
     */
    sprites: SpriteOrArray[] = [
        this.main, this.background, this.green
    ];

    //#region
    private readonly MAX_LAYERS = settings.MAX_LAYERS ?? 1;
    constructor() {
        s = this;
    }


    /**@ignore */
    updateSprites() {
        // messageStep
        while (messages.hasMessages()) {
            let message = messages.obtain()!;
            if (window.debugTools && window.debugTools.logMessages) {
                window.debugTools.calledMessages.push(message)
            }

            for (const obj of this.sprites) {
                if (Array.isArray(obj)) {
                    // it is a group
                    for (const sprite of obj) {
                        if (!sprite.new && !sprite.delete && !(sprite.master && sprite.master.delete)) {
                            sprite.messageStep(message);
                        }
                    }
                }
                else {
                    // it is a sprite
                    if (!obj.new && !obj.delete && !(obj.master && obj.master.delete)) {
                        obj.messageStep(message);
                    }
                }
            }
        }

        // handle deletion of sprites
        for (const group of this.sprites) {
            if (Array.isArray(group)) {
                for (let i = group.length-1; i >= 0; i-=1) {
                    const sprite = group[i];
                    if (
                        sprite.delete
                        || (sprite.master && sprite.master.delete) // if the slave's master is deleted, delete the slave
                    ) {
                        group.splice(i, 1); // deletes the sprite from its group
                    }
                }
            }
        }

        this.takeNewFromSprites();
    }

    /**@ignore */
    takeNewFromSprites(){
        for (const obj of this.sprites) {
            if (Array.isArray(obj)) {
                for (const sprite of obj) {
                    if (sprite.new) {
                        sprite.new = false;
                    }
                }
            }
            else {
                if (obj.new) {
                    obj.new = false;
                }
            }
        }
    }

    /**@ignore */
    drawSprites(ctx: Ctx2D) {
        for (let layer = 0; layer <= this.MAX_LAYERS; layer++) {
            for (let obj of this.sprites) {
                if (Array.isArray(obj)) {
                    for (let sprite of obj) {
                        if (sprite.visible && layer === sprite.layer) {
                            ctx.save();
                            sprite.draw(ctx);
                            ctx.restore();
                            ctx.resetTransform();
                        }
                    }
                }
                else {
                    if (obj.visible && layer === obj.layer) {
                        ctx.save();
                        obj.draw(ctx);
                        ctx.restore();
                        ctx.resetTransform();
                    }
                }
            }
        }
    }
    //#endregion
}

/** When constructing a sprite while the project is loading, the sprite
 * storage is not yet accessible. */
export let s: SpriteStorage = (undefined as any);