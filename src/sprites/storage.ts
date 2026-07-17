import * as PIXI from "pixi.js";
import * as F from "@/core/functions";
import { Msg } from "@/editable/msg";
import { TopLogicObject, TopSprite, TopContainer, Collection, ObjectPool, AutoCollection } from "@/core/base_classes";
import { messages, layers } from "@/core/sensing_properties";

import { Main } from "@/sprites/sprite_main";

// SPRITE STORAGE
type TopObjectOrCollection = TopLogicObject|Collection;
export class SpriteStorage {
    //#region 
    main = new Main();

    //#endregion
    
    objectList(): TopObjectOrCollection[] {
        // add objects to the logic and drawing order (EDITABLE)
        return [
            this.main
        ];
    }

    //#region
    /** The basic container of all objects */
    readonly container: PIXI.Container<TopObjectOrCollection | PIXI.RenderLayer> = new PIXI.Container();

    constructor() {
        s = this;

        this.container.interactiveChildren = false;
        this.container.accessibleChildren = false;
        this.container.cullableChildren = false;

        for (let topObject of this.objectList()) {
            this.container.addChild(topObject);
        }
        // add layers for rendering objects
        for (let layer of layers) {
            this.container.addChild(layer);
        }
    }

    /**@ignore */
    updateObjects() {
        // messageStep
        messages.broadcast(Msg.TICK);
        const objectsToDelete: TopLogicObject[] = [];
        while (messages.hasMessages()) {
            let message = messages.obtain()!;
            if (window.debugTools && window.debugTools.logMessages) {
                window.debugTools.calledMessages.push(message)
            };

            for (const topElement of this.container.children) {
                if (topElement instanceof Collection) {
                    for (const child of topElement.children) {
                        if (child.enabled && !child.new && !(child.delete || (child.master && child.master.delete))) {
                            child.messageStep(message);
                        }
                    }
                }
                else if (!(topElement instanceof PIXI.RenderLayer)) {
                    if (topElement.enabled && !topElement.new) {
                        topElement.messageStep(message);
                    }
                }
            }
        }

        // handle deletion of objects
        for (const topElement of this.container.children) {
            if (topElement instanceof Collection) {
                for (const child of topElement.children) {
                    if (child.delete || (child.master && child.master.delete)) {
                        child.delete = true;
                        objectsToDelete.push(child);
                    }
                }
            }
        }
        for (const child of objectsToDelete) {
            if (child.belongsToPool) {
                child.belongsToPool.release(child);
            }
            else {
                child.destroy(child.deleteOptionsH);
            }
        }

        this.takeNewFromObjects();
    }

    /**@ignore */
    takeNewFromObjects(){
        for (const topElement of this.container.children) {
            if (topElement instanceof Collection) {
                for (const child of topElement.children) {
                    if (child.new) {
                        child.new = false;
                    }
                }
            }
            else if (!(topElement instanceof PIXI.RenderLayer)) {
                if (topElement.new) {
                    topElement.new = false;
                }
            }
        }
    }
    //#endregion
}

/** When constructing a sprite while the project is loading, the sprite storage is not yet accessible.
 * 
 * Example 1: pass another sprite as a constructor parameter
 * ```
 * constructor(another_sprite: SAnotherSprite) {
 *      console.log(another_sprite);
 * }
 * ```
 * Example 2: obtain another sprite from the storage when the message `Msg.START` is broadcast
 * ```
 * messageStep(message: Msg) {
 *      switch (message) {
 *          case Msg.START:
 *              console.log(s.another_sprite);
 *              break;
 *      }
 * }
 * ```
 */
export let s: SpriteStorage = (undefined as any);