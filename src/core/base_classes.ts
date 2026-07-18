import { clamp, rotatePoint } from '@/core/functions';
import { gatheredAssets, type HitboxParameters, type MaskParameters, type RendererProps } from '@/core/asset_loader';

import type { Msg } from '@/editable/msg';
import { m, sf, sfR } from '@/core/sensing_properties';

export type { MaskParameters, HitboxParameters, RendererProps } from "@/core/asset_loader";

export type Ctx2D = CanvasRenderingContext2D;



export interface Point {
    x: number,
    y: number
}

/**
 * A sprite is an object on the screen, for which the way of interaction and logic is realized.
 */
export class Sprite {
    x: number;
    y: number;

    /**
     * The natural width of the sprite's image.
     */
    width = 0;
    /**
     * The natural height of the sprite's image.
     */
    height = 0;
    image!: RendererProps | null;

    /**
     * The anchor point relative to the sprite's top-left corner for position and transformation.
     */
    anchor = {x: 0, y: 0};

    /**
     * Determines whether the sprite should be displayed on the screen.
     */
    visible = true;
    delete = false;
    new = true;
    layer = 0;

    scale = {x: 1, y: 1};
    rotation = 0;
    opacity = 1;

    /**
     * The master sprite, without which this sprite will cease to exist.
     */
    master: Sprite|null = null;

    
    realPositioning = false;

    /**
     * Sets or changes the sprite's image, and assigns it a width and height.
     */
    setImage(image: RendererProps | null){
        this.image = image;
        if (this.image!==null) {
            this.width = this.image.width;
            this.height = this.image.height;
        }
        else {
            this.width = 0;
            this.height = 0;
        }
    }
    
    /**
     * Sets the sprite's anchor point for position, rotation and scaling based on its original width and height factor.
     * @param cx Ranges from 0 to 1 from the left edge to the right.
     * @param cy Ranges from 0 to 1 from the top edge to the bottom.
     */
    setAnchorPoint(cx=0, cy=0){
        this.anchor.x = Math.round(this.width*cx);
        this.anchor.y = Math.round(this.height*cy);
    }
    /**
     * Sets the sprite's anchor point for position, rotation and scaling based on its top-left corner offset.
     */
    setAbsoluteAnchorPoint(x=0, y=0){
        this.anchor.x = x;
        this.anchor.y = y;
    }

    goTo(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    goBy(x: number, y: number) {
        this.x += x;
        this.y += y;
    }

    constructor(x=0, y=0, image: RendererProps | null = null) {
        this.setImage(image);
        this.x = x;
        this.y = y;
        this.setAnchorPoint();
    }
    
    messageStep(message: Msg) {}
    

    drawPosition(ctx: Ctx2D) {
        const drawingX = sf(this.x-this.anchor.x);
        const drawingY = sf(this.y-this.anchor.y);
        if (this.realPositioning) {
            ctx.translate(drawingX, drawingY);
        }
        else {
            ctx.translate(Math.round(drawingX), Math.round(drawingY));
        }
    }

    drawTransformation(ctx: CanvasRenderingContext2D){
        const {x: sx, y: sy} = this.scale;
        const rot = this.rotation;
        const ax = sf(this.anchor.x);
        const ay = sf(this.anchor.y);

        if ((sx !== 1 || sy !== 1 || rot !== 0)) {
            ctx.translate(ax, ay);

            if (rot !== 0) {
                ctx.rotate(rot);
            }
            if (sx !== 1 || sy !== 1) {
                ctx.scale(sx, sy);
            }

            ctx.translate(-ax, -ay);
        }

        if (this.opacity !== 1) {
            ctx.globalAlpha = clamp(this.opacity, 0, 1);
        }
    }

    drawSelf(ctx: Ctx2D) {
        if (this.image!==null) {
            if (this.image.scalable) {
                ctx.scale(m.scaleFactor, m.scaleFactor); // scale self
            }
            ctx.drawImage(this.image.v, 0, 0);
        }
    }

    drawResult(ctx: Ctx2D) {/*default*/
        this.drawSelf(ctx);
    }

    draw(ctx: Ctx2D) {
        this.drawPosition(ctx);
        this.drawTransformation(ctx);
        this.drawResult(ctx);
    }
}


// export abstract class ACompCollidable {
//     constructor(protected sourceSprite: Sprite) {}

//     abstract collidePoint(x: number, y: number): boolean;

//     /** A virtual pointer index of 0 is also compatible with a mouse. */
//     collidePointer(vId: number) {
//         const touchProperty = m.pointers.get(vId);
//         if (touchProperty) {
//             return this.collidePoint(touchProperty.position.x, touchProperty.position.y);
//         }
//         return false;
//     }

   
//     /** Finds which pointer is touching this object. 0 also can be the mouse. Returns -1 if none found. */
//     collideAnyPointer() {
//         for (const [touchIndex, touchProperty] of m.pointers.entries()) {
//             if (this.collidePoint(touchProperty.position.x, touchProperty.position.y)) {
//                 return touchIndex;
//             }
//         }
//         return -1;
//     }
// }

// export class CompHitbox extends ACompCollidable {
//     offsetX=0;
//     offsetY=0;
//     width=0;
//     height=0;
//     affectScale: boolean;

//     constructor(sourceObject: Sprite, hitbox?: HitboxParameters, affectScale=false){
//         super(sourceObject);

//         this.affectScale = affectScale;
        
//         if (hitbox) {
//             this.setHitbox(hitbox);
//         }
//         else {
//             this.setHitboxAuto();
//         }
//     }

//     calculateOriginPoint() {
//         const bounds = this.sourceSprite.getLocalBounds();
//         this.offsetX = bounds.minX;
//         this.offsetY = bounds.minY;
//     }
//     setHitbox(hitbox: HitboxParameters) {
//         this.offsetX = hitbox.offsetX;
//         this.offsetY = hitbox.offsetY;
//         this.width = hitbox.width;
//         this.height = hitbox.height;
//         if (hitbox.calculateOriginPoint) {
//             this.calculateOriginPoint();
//         }
//     }
//     setHitboxAuto() {
//         this.calculateOriginPoint();
//         const bounds = this.sourceSprite.getLocalBounds();
//         this.width = bounds.width;
//         this.height = bounds.height;
//     }

//     hitboxCollidePoint(x: number, y: number){
//         const src = this.sourceSprite;
//         const scaleX = (this.affectScale) ? src.scale.x : 1;
//         const scaleY = (this.affectScale) ? src.scale.y : 1;

//         let left = (src.x + (this.offsetX * scaleX));
//         let top = (src.y + (this.offsetY * scaleY));
//         return (
//             (x >= left)
//             && (x < left + (this.width * scaleX))
//             && (y >= top)
//             && (y < top + (this.height * scaleY))
//         );
//     }

//     collidePoint(x: number, y: number): boolean {
//         return this.hitboxCollidePoint(x, y);
//     }

//     collide(other: CompHitbox) {
//         const src = this.sourceSprite;
//         const oth = other.sourceSprite;

//         const scaleX = this.affectScale ? src.scale.x : 1;
//         const scaleY = this.affectScale ? src.scale.y : 1;
//         const left = src.x + (this.offsetX * scaleX);
//         const top = src.y + (this.offsetY * scaleY);

//         const oScaleX = other.affectScale ? oth.scale.x : 1;
//         const oScaleY = other.affectScale ? oth.scale.y : 1;
//         const oLeft = oth.x + (other.offsetX * oScaleX);
//         const oTop = oth.y + (other.offsetY * oScaleY);

//         return (
//             left + this.width * scaleX > oLeft &&
//             left < oLeft + other.width * oScaleX &&
//             top + this.height * scaleY > oTop &&
//             top < oTop + other.height * oScaleY
//         );
//     }
// }

// export class CompMask extends CompHitbox {
//     matrix: Uint8Array;
//     constructor(sourceObject: Sprite, mask: MaskParameters, affectScale=false){
//         super(sourceObject, mask, affectScale);

//         this.matrix = mask.matrix;
//     }

//     collidePoint(x: number, y: number, affectRotation=false): boolean {
//         const src = this.sourceSprite;
//         const affectScale = this.affectScale;

//         const scaleX = affectScale ? src.scale.x : 1;
//         const scaleY = affectScale ? src.scale.y : 1;

//         let newX = x;
//         let newY = y;

//         if (affectRotation) {
//             const rotatedXY = rotatePoint(x, y, src.rotation, src.x, src.y);
//             newX = rotatedXY.x;
//             newY = rotatedXY.y;
//         }

//         // Calculate local coordinates relative to the hitbox's upper-left corner
//         const rx = ((newX - (src.x + this.offsetX * scaleX)) / scaleX) | 0;
//         const ry = ((newY - (src.y + this.offsetY * scaleY)) / scaleY) | 0;

//         const width = this.width;

//         // check the matrix boundary
//         if (rx < 0 || rx >= width || ry < 0 || ry >= this.height) {
//             return false;
//         }

//         // Pixel index in one-dimensional array
//         const i = rx + ry * width;

//         const byte = this.matrix[i >> 3];
        
//         // Use a left shift of the mask, inverting the logic
//         return (byte & (0x80 >>> (i & 7))) !== 0;
//     }
// }

// export class CompGroup extends ACompCollidable {
//     group;
//     constructor(sourceObject: Sprite, group: ACompCollidable[] = []){
//         super(sourceObject);
//         this.group = group;
//     }

//     collidePoint(x: number, y: number) {
//         for (let collidable of this.group) {
//             if (collidable.collidePoint(x, y)) {
//                 return true;
//             }
//         }
//         return false;
//     }
// }
