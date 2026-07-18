import type { ACompCollidable, Ctx2D, Point, RendererProps, Sprite } from "@/core/base_classes";

import * as F from "@/core/functions";
import { m, sf, sfR } from "@/core/sensing_properties";
import { Msg } from "./msg";


export function getColorFromGradient(colors=["#000000","#ffffff"], factor=0) {
    factor = F.clamp(factor, 0, 1); // MINE
    // AI GENERATED //

    // If there's only one color, return it
    if (colors.length === 1) return colors[0];

    // Find the two colors to interpolate between
    const index = (colors.length - 1) * factor;
    const i = Math.floor(index);
    const t = index - i; // Relative position within the segment (0 to 1)

    const color1 = colors[i];
    const color2 = colors[Math.min(i + 1, colors.length - 1)];

    // Interpolate between the two colors (assuming hex format #RRGGBB)
    const rgb = [0, 1, 2].map(j => {
        const c1 = parseInt(color1.slice(1 + j * 2, 3 + j * 2), 16);
        const c2 = parseInt(color2.slice(1 + j * 2, 3 + j * 2), 16);
        return Math.round(c1 * (1 - t) + c2 * t);
    });

    // Convert RGB to hex
    return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
}

interface AnimationParameter {
    duration: number,
    /** Time offset since the animation start. */
    offset?: number,

    onStart?: (t: AnimationTimeProperties)=>void,
    onTick?: (t: AnimationTimeProperties)=>void,
    /** If this callback is defined, it will be executed instead of `onTick()` when the animation part is finished. */
    onFinish?: (t: AnimationTimeProperties)=>void
}
interface AnimationParameterE extends AnimationParameter {
    offset: number
}
interface AnimationTimeProperties {
    time: number,
    totalTime: number,
    duration: number,
    percent: number
}

/**
 * An instance of the AnimationSequence class allows you to sequently 
 * and smoothly change the numbers for specified period of time assigned 
 * to mutable data types or, in simple terms, to play smooth animations 
 * of object positions and states.
 */
export class AnimationSequence {
    animationList: AnimationParameterE[] = [];

    private idleAnimations = new Set<AnimationParameterE>();
    private playingAnimations = new Set<AnimationParameterE>();

    /** Time in seconds since an animation has started. */
    totalTime = 0;
    /** Whether the animation is playing. If this property is false, the animation has paused or stopped. */
    playing = false;
    /** Whether the animation can be played again using `startOnce()`. */
    canStart = true;

    /** Executed at the start of the animation. Call this method to set the initial state immediately. */
    public onStart?: ()=>void;
    constructor(onStart?: ()=>void) {
        this.onStart = onStart;
    }

    /** A builder method. */
    createState(properties: AnimationParameter) {
        this.animationList.push({
            duration: properties.duration,
            offset: properties.offset ?? 0,
            onStart: properties.onStart,
            onTick: properties.onTick,
            onFinish: properties.onFinish
        });
        return this;
    }

    start(noFirstTick=false, timeOffset=0) {
        this.playing = true;
        this.totalTime = timeOffset;

        for (const animation of this.animationList) {
            this.idleAnimations.add(animation);
        }
        this.playingAnimations.clear();

        if (this.onStart) {
            this.onStart();
        }
        
        if (!noFirstTick) {
            for (const animation of this.animationList.filter((el)=>(el.offset === 0))) {
                if (animation.onTick) {
                    animation.onTick(this.getTimeProperty(animation, (timeOffset)));
                }
            } 
        }
    }

    /** Controlled by the property `canStart`. */
    startOnce(noFirstTick=false, timeOffset=0) {
        if (this.canStart) {
            this.canStart = false;
            this.start(noFirstTick, timeOffset);
        }
    }

    stop() {
        this.playing = false;
    }

    /** An essential method for handling animation. When not called, the animation is paused. */
    simulateTick() {
        if (this.playing) {
            this.totalTime += m.delta;

            // handle idle animations
            for (const animation of this.idleAnimations.values()) {
                if (this.totalTime >= animation.offset) {
                    this.idleAnimations.delete(animation);
                    this.playingAnimations.add(animation);

                    if (animation.onStart) {
                        animation.onStart(this.getTimeProperty(animation, (this.totalTime - animation.offset)));
                    }
                }
            }

            // handle playing animations
            for (const animation of this.playingAnimations.values()) {
                if (this.totalTime >= animation.offset+animation.duration) {
                    // animation has finished
                    this.playingAnimations.delete(animation);
                    if (this.idleAnimations.size === 0 && this.playingAnimations.size === 0) {
                        this.playing = false;
                    }

                    if (animation.onFinish) {
                        animation.onFinish(this.getTimeProperty(animation, (animation.duration)));
                    }
                    else if (animation.onTick) {
                        animation.onTick(this.getTimeProperty(animation, (animation.duration)));
                    }
                }
                else {
                    // animation is playing
                    if (animation.onTick) {
                        animation.onTick(this.getTimeProperty(animation, (this.totalTime - animation.offset)));
                    }
                }
            }
        }
    }

    private getTimeProperty(anim: AnimationParameterE, time: number): AnimationTimeProperties {
        return {
            time: time,
            totalTime: this.totalTime,
            duration: anim.duration,
            percent: (anim.duration > 0) ? time/anim.duration : 0
        }
    }
}


export class Subcanvas<Args extends any[] = []> {
    c: HTMLCanvasElement;
    ctx: Ctx2D;
    /**
     * Original width.
     */
    width: number;
    /**
     * Original height.
     */
    height: number;

    /** 
     * Floating anchor point inside the subcanvas for context positioning and transformation. 
     */
    anchor: Point;
    setAnchorPoint(cx=0, cy=0){
        this.anchor.x = cx;
        this.anchor.y = cy;
    }

    /**
     * A set of functions for drawing on the sub-canvas
     * using the `render()` method.
     */
    renderFunc: (subcanvasCtx: Ctx2D, ...parameters: any[])=>void;
    protected readonly scaleSelf: boolean;

    /**
     * Creates a subcanvas. Call the method `render()` to render it.
     * 
     * Note that `ctx` holds the state of most settings except transformation matrix when the subcanvas is resized.
     */
    constructor(
        width: number,
        height: number,
        renderFunc: (subcanvasCtx: Ctx2D, ...parameters: Args)=>void,
        properties?: { noScaleSelf?: boolean, anchor?: Point }
    ) {
        this.scaleSelf = !(properties?.noScaleSelf ?? false);
        this.anchor = (properties?.anchor) ?? {x: 0, y: 0};
        this.renderFunc = renderFunc;

        this.c = document.createElement("canvas");
        this.ctx = this.c.getContext("2d")!;
        this.width = width;
        this.height = height;

        this.resizeToScale();
    }

    /**
     * Urgently renders the subcanvas according to the `renderFunc()` method. Parameter types must exactly match those in the `renderFunc()` method.
     */
    render(...parameters: Args) {
        const sctx = this.ctx;
        this.clear();
        if (this.scaleSelf) {
            sctx.scale(m.realScale, m.realScale);
        }
        if (this.anchor.x !== 0 || this.anchor.y !== 0) {
            sctx.translate(this.anchor.x * this.width, this.anchor.y * this.height);
        }
        this.renderFunc(sctx, ...parameters);
        sctx.resetTransform();
    }

    resizeToScale(width?: number, height?: number) {
        if (width!==undefined && height!==undefined) {
            this.width = width;
            this.height = height;
        }

        // manually save state
        const properties = [
            "fillStyle", "font", "globalAlpha", "globalCompositeOperation",
            "lineCap", "lineJoin", "lineWidth", "miterLimit",
            "shadowBlur", "shadowColor", "shadowOffsetX", "shadowOffsetY",
            "strokeStyle", "textAlign", "textBaseline"
        ];
        const savedState: Record<string, any> = {};
        for (const prop of properties) {
            savedState[prop] = (<any>this.ctx)[prop];
        }

        this.c.width = sfR(this.width);
        this.c.height = sfR(this.height);

        // restore state after the canvas is resized
        // note that `ctx.restore()` won't help in this situation
        for (const prop in savedState) {
            (<any>this.ctx)[prop] = savedState[prop];
        }
    }
    clear() {
        this.ctx.clearRect(0, 0, this.c.width, this.c.height);
    }
    /**
     * Displays the subcanvas on the screen.
     * 
     * Placed inside the method `Sprite.drawResult()`.
     */
    display(ctx: Ctx2D) {
        ctx.drawImage(this.c, 0, 0);

        if (window.debugTools && window.debugTools.showBounds) {
            ctx.save();
            ctx.fillStyle = "#00ff0040";
            ctx.fillRect(0, 0, sf(this.width), sf(this.height));
            ctx.restore();
        }
    }
}
export class AutoSubcanvas<Args extends any[] = []> extends Subcanvas<Args> {
    private lastParams: Args | [] = [];
    private sprite: Sprite;
    /**
     * Set to `true` to force update the sub-canvas.
     */
    postponedUpdate = true;

    constructor(
        sprite: Sprite,
        width: number, 
        height: number, 
        renderFunc: (subcanvasCtx: Ctx2D, ...parameters: Args) => void, 
        properties?: { noScaleSelf?: boolean, anchor?: Point }
    ) {
        super(width, height, renderFunc, properties);
        this.sprite = sprite;
    }

    /**
     * Automatically sizes and refreshes the subcanvas content when visible, 
     * postponing updates if the linked sprite is hidden.
     * 
     * Placed inside the method `Sprite.messageStep()` with the message `Msg.TICK_AFTER`.
     */
    update(...parameters: Args): void {
        const isResized = m.isResized;

        if (isResized) {
            this.resizeToScale();
        }

        const paramsHaveChanged = this.areParamsChanged(parameters);

        // If the sprite is hidden and something has changed, make a postponed render
        if (!this.sprite.visible) {
            if (paramsHaveChanged || isResized) {
                this.postponedUpdate = true;
                this.lastParams = [...parameters];
            }

            return;
        }

        // If the sprite is visible
        if (paramsHaveChanged || isResized || this.postponedUpdate) {
            this.postponedUpdate = false;
            this.render(...parameters);
        }
    }

    override render(...parameters: Args) {
        this.lastParams = [...parameters];
        super.render(...parameters);
    }

    private areParamsChanged(newParams: Args) {
        if (newParams.length !== this.lastParams.length) return true;
        for (let i = 0; i < newParams.length; i++) {
            if (newParams[i] !== this.lastParams[i]) return true;
        }
        return false;
    }
}

type TextAnchor = "topLeft"|"topCenter"|"topRight"
    |"middleLeft"|"middleCenter"|"middleRight"
    |"bottomLeft"|"bottomCenter"|"bottomRight"
    |"left"|"center"|"right";

export class SubcanvasText extends Subcanvas<[]> {
    static readonly TEXT_ANCHOR_MAP: Record<TextAnchor, [CanvasTextAlign, CanvasTextBaseline]> = {
        topLeft: ["left", "top"],
        topCenter: ["center", "top"],
        topRight: ["right", "top"],
        middleLeft: ["left", "middle"],
        middleCenter: ["center", "middle"],
        middleRight: ["right", "middle"],
        bottomLeft: ["left", "bottom"],
        bottomCenter: ["center", "bottom"],
        bottomRight: ["right",  "bottom"],
        left: ["left", "middle"],
        center: ["center", "middle"],
        right: ["right", "middle"]
    };
    static readonly TEXT_ANCHOR_X: Record<any, number> = {
        left: 0,
        center: 0.5,
        right: 1
    };
    static readonly TEXT_ANCHOR_Y: Record<any, number> = {
        top: 0,
        middle: 0.5,
        bottom: 1
    };

    protected textH = "";

    /**
     * Set to `true` to force update the sub-canvas.
     */
    postponedUpdate = true;

    get text() {
        return this.textH;
    }
    set text(b: string) {
        if (this.textH !== b) {
            this.textH = b;

            this.postponedUpdate = true;
        }
    }

    setTextAnchor(textAnchor: TextAnchor) {
        const [align, baseline] = SubcanvasText.TEXT_ANCHOR_MAP[textAnchor];

        this.setAnchorPoint(SubcanvasText.TEXT_ANCHOR_X[align], SubcanvasText.TEXT_ANCHOR_Y[baseline]);

        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
    }

    private sprite: Sprite;
    constructor(sprite: Sprite, width: number, height: number) {
        super(width, height, (sctx)=>{
            this.fillText(0, 0);
        });
        this.sprite = sprite;

        this.setTextAnchor("left");
    }

    fillText(offsetX: number, offsetY: number) {
        this.ctx.fillText(
            this.textH, offsetX, offsetY
        );
    }
    strokeText(offsetX: number, offsetY: number) {
        this.ctx.strokeText(
            this.textH, offsetX, offsetY
        );
    }

    /**
     * Automatically draws text with predefined sub-canvas context properties `font`, `textAlign`, `textBaseline`, etc.
     * 
     * Placed inside the method `Sprite.messageStep()` with the message `Msg.TICK_AFTER`.
     */
    update() {
        const isResized = m.isResized;

        if (isResized) {
            this.resizeToScale();
            this.postponedUpdate = true;
        }

        if (this.sprite.visible && this.postponedUpdate) {
            this.postponedUpdate = false;
            this.render();
        }
    }
}

export class SubcanvasWrappedText extends SubcanvasText {
    /** @default 16 */
    lineHeightPx = 16;
    
    constructor(sprite: Sprite, width: number, height: number) {
        super(sprite, width, height);
        this.renderFunc = (sctx)=>{
            const lines = this.preWrapText(this.width).map(lineWithWidth => lineWithWidth[0]);
            this.drawText(lines, 0, 0, true);
        };
    }

    preWrapText(maxWidth: number) {
        return CtxToolkit.preWrapText(this.ctx, this.textH, maxWidth);
    }

    drawText(lines: string[], offsetX: number, offsetY: number, fill=false, stroke=false) {
        const sctx = this.ctx;

        let stringY = offsetY - ((lines.length-1)*this.lineHeightPx*this.anchor.y);
        lines.forEach((line)=>{
            if (fill) sctx.fillText(line, offsetX, stringY);
            if (stroke) sctx.strokeText(line, offsetX, stringY);
            stringY+=this.lineHeightPx;
        });
    }
}


export class CompClickable<T extends Sprite = Sprite> {
    private static clickedSprite: Sprite|null = null;
    constructor(
        private sprite: T,
        private collidable: ACompCollidable,
        private clickAction: (obj: T)=>void,
        public baseImageKey=""
    ) {}

    pressed = false;
    focused = false;

    /**
     * Placed inside the method `Sprite.messageStep()` with the message `Msg.TICK`.
     */
    tickClick() {
        if (this.sprite.visible && m.pointerIsPressed(0) && this.collidable.collidePointer(0)) {
            CompClickable.clickedSprite = this.sprite;
        }
    }

    processClick() {
        if (CompClickable.clickedSprite === this.sprite) {
            CompClickable.clickedSprite = null;
            this.pressed = true;
        }

        if (this.pressed) {
            if (!m.pointerIsDown(0)) {
                this.pressed = false;
                if (this.focused) {
                    this.focused = false;
                    
                    this.clickAction(this.sprite);
                }
            }

            this.focused = this.collidable.collidePointer(0);
        }
        
        if (this.baseImageKey) {
            this.sprite.setImageKeyTick(
                this.focused
                ? (this.baseImageKey + "-p")
                : (this.baseImageKey)
            );
        }
    }
}


export namespace CtxToolkit {
    export function defineCapsule(x: number, y: number, width: number, height: number) {
        const path = new Path2D();
        const R = Math.min(width, height)/2;
        
        if (width >= height) {
            // horizontal capsule
            path.arc(x + R, y + R, R, Math.PI / 2, (3 * Math.PI) / 2);
            path.arc(x + width - R, y + R, R, (3 * Math.PI) / 2, Math.PI / 2);
        }
        else {
            // vertical capsule
            path.arc(x + R, y + R, R, Math.PI, 0);
            path.arc(x + R, y + height - R, R, 0, Math.PI);
        }
        
        path.closePath();
        return path;
    }

    export function defineRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
        const path = new Path2D();
        const R = Math.min(radius, width / 2, height / 2);
        
        path.moveTo(x + R, y);
        
        // Top edge and top right corner
        path.lineTo(x + width - R, y);
        path.arcTo(x + width, y, x + width, y + R, R);
        
        // Right edge and bottom right corner
        path.lineTo(x + width, y + height - R);
        path.arcTo(x + width, y + height, x + width - R, y + height, R);
        
        // Bottom edge and bottom left corner
        path.lineTo(x + R, y + height);
        path.arcTo(x, y + height, x, y + height - R, R);
        
        // Left edge and top left corner
        path.lineTo(x, y + R);
        path.arcTo(x, y, x + R, y, R);
        
        path.closePath();
        return path;
    }

    /** Returns a tuple of lines and its widths with a primarily specified property `ctx.text`. */
    export function preWrapText(ctx: Ctx2D, text: string, maxWidth: number) {
        const paragraphs = text.split('\n');
        const linesAndWidths: [string, number][] = [];
        
        // break paragraphs
        for (let p = 0; p < paragraphs.length; p++) {
            const paragraph = paragraphs[p];

            // if the paragraph is empty
            if (paragraph.trim() === "") {
                linesAndWidths.push(["", 0]);
                continue;
            }

            // break words
            const words = paragraph.split(' ');
            let currentLine = "";
            let currentWidth = 0;
            for (let i = 0; i < words.length; i++) {
                const testLine = currentLine + words[i] + ' ';
                const testWidth = ctx.measureText(testLine).width;

                if (testWidth > maxWidth && i > 0) {
                    linesAndWidths.push([currentLine.trim(), currentWidth]);
                    currentLine = words[i] + ' ';
                }
                else {
                    currentLine = testLine;
                    currentWidth = testWidth;
                }
            }

            linesAndWidths.push([currentLine.trim(), currentWidth]);
        }

        return linesAndWidths;
    }

    export function preWrapTextToTwoLines(ctx: Ctx2D, text: string): [string, number][] {
        const words = text.split(' ');

        if (words.length <= 1) {
            const width = ctx.measureText(text).width;
            return [[text, width]];
        }

        let minDifference = 9999;
        let bestSplit: ([string, number][])|null = null;

        for (let i = 1; i < words.length; i++) {
            const line1 = words.slice(0, i).join(' ');
            const line2 = words.slice(i).join(' ');

            const width1 = ctx.measureText(line1).width;
            const width2 = ctx.measureText(line2).width;

            const difference = Math.abs(width1 - width2);

            if (difference < minDifference) {
                minDifference = difference;
                bestSplit = [
                    [line1, width1],
                    [line2, width2]
                ];
            }
        }

        return bestSplit!;
    }

    export function getLineHeight(ctx: Ctx2D, lineHeightFactor=1) {
        const match = ctx.font.match(/(\d+(?:\.\d+)?)(px)/i)!;
        return (parseFloat(match[1]) * lineHeightFactor);
    }

    export function drawWrappedText(ctx: Ctx2D, lines: string[], x: number, y: number, lineHeightFactor=1) {
        const textBaseline = ctx.textBaseline;
        const textAnchorY = (textBaseline === "middle") ? 0.5 : (textBaseline === "top") ? 0 : 1;
        const lineHeightPx = CtxToolkit.getLineHeight(ctx, lineHeightFactor);

        let stringY = y - ((lines.length-1)*lineHeightPx*textAnchorY);
        lines.forEach((line)=>{
            ctx.fillText(
                line,
                x,
                stringY
            );
            stringY+=lineHeightPx;
        });
    }

    /** Wraps and fills text with predefined canvas context properties `font`, `textAlign`, `textBaseline`, etc. */
    export function wrapText(ctx: Ctx2D, text: string, x: number, y: number, maxWidth: number, lineHeightFactor=1) {
        const lines = CtxToolkit.preWrapText(ctx, text, maxWidth).map(lineWithWidth => lineWithWidth[0]);
        CtxToolkit.drawWrappedText(ctx, lines, x, y, lineHeightFactor);

        return lines;
    }
}

export function shrinkToFit(el: HTMLElement, minFontSize=8) {
    // Calculate sizes
    const fitWidth = el.clientWidth;
    const fitHeight = el.clientHeight;
    let fontSize = parseInt(window.getComputedStyle(el).fontSize);

    while ((fitWidth < el.scrollWidth || fitHeight < el.scrollHeight) && fontSize > minFontSize) {
        fontSize-=1;
        el.style.fontSize = fontSize+"px";
    }
}
