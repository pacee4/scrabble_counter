import * as F from "@/core/functions";
import { soundManager } from "@/core/sound_manager";

import { Msg } from "@/editable/msg";
import { settings } from "@/editable/settings";
import { m, messages, sf } from "@/core/sensing_properties";
import { SpriteStorage } from "@/sprites/storage";
import { showEl, hideEl, els, UI } from "@/dom";
import { gatheredAssets, loadAssets, type CanvasProps, type ImageProps, type MaskParameters, type ResourcesToLoad } from "./core/asset_loader";
import type { Ctx2D } from "./core/base_classes";


if (import.meta.env.DEV) {
    import("@/debug_tools").then((module)=>{
        window.debugTools = new module.DebugTools(m);
    });
}


class MaskCreator {
    private canvas: HTMLCanvasElement;
    private ctxM: CanvasRenderingContext2D;
    constructor(maxWidth=480, maxHeight=360) {
        this.canvas = document.createElement("canvas");
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;
        this.ctxM = this.canvas.getContext("2d", {willReadFrequently: true})!;
    }

    createMask(image: ImageProps, alphaThreshold=0.5): MaskParameters {
        this.ctxM.drawImage(image.v, 0, 0);

        // mask matrix the size of a target image
        const width = image.width;
        const height = image.height;
        const pixels = this.ctxM.getImageData(0, 0, width, height);

        const matrix = new Uint8Array( Math.ceil(width*height/8) );
        const thresholdValue = Math.round(alphaThreshold * 254);
        
        let B = 0; // byte
        let b = 0; // bit
        let currentByte = 0;
        
        let i = 3; // begin with the alpha-channel of the first pixel
        const len = pixels.data.length;

        while (i < len) {
            currentByte = currentByte << 1;
            if (pixels.data[i] > thresholdValue) { // if the pixel is opaque
                currentByte += 1;
            }

            // increment the bit
            b++;
            if (b >= 8) {
                matrix[B] = currentByte;
                currentByte = 0;
                b = 0;
                B++;
            }
            i += 4;
        }
        // Write the remaining bits if the size is not a multiple of 8
        if (b > 0) {
            matrix[B] = currentByte << (8 - b);
        }

        this.ctxM.clearRect(0, 0, this.canvas.width, this.canvas.height);
        return {
            offsetX: 0,
            offsetY: 0,
            width: width,
            height: height,
            matrix: matrix,
            calculateOriginPoint: true
        };
    }
}
 

class Screen {
    private canvas = document.createElement("canvas");
    private ctx!: Ctx2D;
    private s!: SpriteStorage;

    private lastFrameMs = 0;

    private readonly LOGICAL_WIDTH = settings.SCREEN_WIDTH;
    private readonly LOGICAL_HEIGHT = settings.SCREEN_HEIGHT;
    private SCALED_WIDTH = this.LOGICAL_WIDTH;
    private SCALED_HEIGHT = this.LOGICAL_HEIGHT;
    private readonly divCanvasPos = {x: 0, y: 0}; // need for correct mouse/pointer position

    private readonly virtualIds = new Map<number, number>();

    public async init(resourcesToLoad: ResourcesToLoad) {
        this.ctx = this.canvas.getContext("2d")!;

        await loadAssets(resourcesToLoad);

        // obtain subcanvas images
        for (const imageName in gatheredAssets.images) {
            if (resourcesToLoad.subcanvasImagesBlacklist?.includes(imageName)) {
                continue;
            }
            const imageProp = gatheredAssets.images[imageName];
            gatheredAssets.subcanvasImages[imageName] = {
                v: this.imageToSubcanvas(imageProp.v),
                width: imageProp.width,
                height: imageProp.height,
                scalable: false
            };
        }

        // obtain masks
        if (resourcesToLoad.masks) {
            const maskCreator = new MaskCreator(screen.LOGICAL_WIDTH, screen.LOGICAL_HEIGHT);

            for (let maskSource of resourcesToLoad.masks) {
                if (gatheredAssets.images[maskSource]) {
                    gatheredAssets.masks[maskSource] = maskCreator.createMask(gatheredAssets.images[maskSource]);
                }
                else {
                    console.warn(`The texture key is not found to create the mask from: ${maskSource}`)
                }
            }
        }

        // obtain volume nodes
        if (resourcesToLoad.audioVolumeNodes && soundManager.audioCtx) {
            soundManager.volumeNodes.set("general", soundManager.audioCtx.createGain());
            for (let volumeNode of resourcesToLoad.audioVolumeNodes) {
                soundManager.volumeNodes.set(volumeNode, soundManager.audioCtx.createGain());
            }
        }

        // create the sprite storage
        this.s = new SpriteStorage();
        this.s.takeNewFromSprites();


        this.setEventListeners();
        // set width and height of #divCanvasElements
        els.divCanvasElements.style.width = `${this.LOGICAL_WIDTH}px`;
        els.divCanvasElements.style.height =`${this.LOGICAL_HEIGHT}px`;

        // Show game
        els.divCanvas.insertBefore(this.canvas, els.divCanvas.firstChild);

        document.getElementById("g-divProgressBar")!.remove(); // Delete the progress bar overlay
        showEl(els.divGame);
        
        // important on load
        this.onResize();
        messages.broadcast(Msg.START);
        requestAnimationFrame(this.tick);
    }

    private tick = (currentMs: number)=>{
        // STEP 1: measure time
        m.time = currentMs/1000;
        m.delta = (currentMs - this.lastFrameMs)/1000;
        if (m.delta > 0.5) {m.delta = 0;}
        this.lastFrameMs = currentMs;
        
        if (window.debugTools && window.debugTools.isShown()) {
            window.debugTools.updateDebugInfo(m.delta);
        }
        try {
            if ((!window.debugTools) || (!window.debugTools.paused)) {
                // STEP 2: handle the logic of objects
                this.s.updateSprites();

                // STEP 3: draw
                // clear canvas
                this.ctx.clearRect(0, 0, this.SCALED_WIDTH, this.SCALED_HEIGHT);
                // draw sprites
                this.s.drawSprites(this.ctx);

                // pass tick
                if (m.resolutionHasChanged) {m.resolutionHasChanged = false;}
                if (window.debugTools && window.debugTools.logMessages) {
                    console.log(`Messages: ${window.debugTools.calledMessages.map(msg=>msg.toString()).join(", ")}`);
                    window.debugTools.calledMessages.splice(0);
                }
            }
            window.requestAnimationFrame(this.tick);
        }
        catch(error){
            console.error(error);alert(error);
            if (window.debugTools && window.debugTools.logMessages) {
                console.log(`Messages: ${window.debugTools.calledMessages.map(msg=>msg.toString()).join(", ")}`);
            }
        }
    }


    // Set event listeners
    //#region
    private getPointerPos(event: PointerEvent) {
        return {
            x: F.clamp(((event.clientX-this.divCanvasPos.x) / m.realScale), 0, this.LOGICAL_WIDTH),
            y: F.clamp(((event.clientY-this.divCanvasPos.y) / m.realScale), 0, this.LOGICAL_HEIGHT)
        };
    }
    private deleteVirtualId(event: PointerEvent) {
        const realPointerId = event.pointerId;
        if (els.divCanvas.hasPointerCapture(realPointerId)) {
            els.divCanvas.releasePointerCapture(realPointerId);
        }

        const vId = this.virtualIds.get(realPointerId);
        if (vId === undefined) return;
        m.pointers.delete(vId);
        this.virtualIds.delete(realPointerId);
    }

    private registerVirtualId(realPointerId: number) {
        const values = Array.from(this.virtualIds.values());
        for (let i = 0; i < 10; i++) {
            if (!values.includes(i)) {
                this.virtualIds.set(realPointerId, i);
                return i;
            }
        }
        return realPointerId;
    }


    private handleEventKeyDown = (event: KeyboardEvent) => {
        if (UI.gameIsFocused) {
            m.simulateKeyDown(event.code, event.key);
        }
    }
    private handleEventKeyUp = (event: KeyboardEvent) => {
        if (UI.gameIsFocused) {
            m.simulateKeyUp(event.code);
        }
    }

    private setEventListeners() {
        // resize
        window.addEventListener("resize", ()=>{
            if (!m.isFocused) {
                this.onResize();
            }
            else {
                if (window.innerHeight*m.dp < parseInt(els.divCanvas.style.height)) { // if the viewport height is less than canvas height (in device pixels)
                    els.divCanvasPositioning.classList.add("js-input-scrollable");
                } else {
                    els.divCanvasPositioning.classList.remove("js-input-scrollable");
                }
            }
        });


        // disable pull-to-refresh in mobile browser
        document.documentElement.style.overscrollBehavior = "none";
        document.body.style.overscrollBehavior = "none";
        if (matchMedia("screen and (pointer: coarse)").matches) {
            // just in case, prevent from swipe-to-close behavior in Telegram's built-in browser
            if (els.divCanvasElements.children.length > 0) {
                els.divCanvasPositioning.addEventListener("touchmove", (event)=>{
                    if (!els.divCanvasPositioning.classList.contains("js-input-scrollable")) {
                        const target = <HTMLElement|null>event.target;
                        if (target && (
                            (target === this.canvas
                            || target === els.divCanvasPositioning
                            || target === els.divCanvasElements
                            || target.classList.contains("transparent"))
                        )) {
                            event.preventDefault();
                        }
                    }
                }, { passive: false });
            }
            else {
                els.divCanvasPositioning.addEventListener("touchmove", (event)=>{
                    event.preventDefault();
                }, { passive: false });
            }
        }


        // disable right-click context menu
        els.divCanvas.addEventListener("contextmenu", (event)=>{
            const target = <HTMLElement|null>event.target;
            if (target && (
                target === this.canvas
                || target === els.divCanvasElements
                || target.classList.contains("transparent"))
            ) {
                event.preventDefault(); // stop context menu
            }
        });


        // pointer interaction
        els.divCanvas.addEventListener("pointerdown", (event: PointerEvent)=>{
            if (event.pointerType === "mouse" && event.button !== 0) return;

            if (event.pointerType !== "mouse") {
                els.divCanvas.setPointerCapture(event.pointerId); // to avoid the bug that shows context menu when the right mouse button clicked while the left button is being held
            }
            const vId = this.registerVirtualId(event.pointerId);
            
            const pointerPos = this.getPointerPos(event);
            m.pointers.set(vId, {
                position: pointerPos,
                holding: false
            });

            if (vId === 0) {
                m.mouseX = pointerPos.x;
                m.mouseY = pointerPos.y;
            }
        });
        els.divCanvas.addEventListener("pointermove", (event: PointerEvent)=>{
            const vId = this.virtualIds.get(event.pointerId);

            if (event.pointerType !== "mouse" && vId === undefined) return;
            const pointerPos = this.getPointerPos(event);
            if (event.pointerType === "mouse" || vId === 0) {
                m.mouseX = pointerPos.x;
                m.mouseY = pointerPos.y;
            }

            if (vId === undefined) return;
            const pointerProperty = m.pointers.get(vId);
            if (pointerProperty) {
                pointerProperty.position.x = pointerPos.x;
                pointerProperty.position.y = pointerPos.y;
            }
        });
        els.divCanvas.addEventListener("pointerup", this.deleteVirtualId.bind(this));
        els.divCanvas.addEventListener("pointercancel", this.deleteVirtualId.bind(this));
        
        els.divCanvas.addEventListener("pointerenter", (event)=>{
            m.hoveredPointerCount+=1;
        })
        els.divCanvas.addEventListener("pointerleave", (event)=>{
            m.hoveredPointerCount-=1;
            if (event.pointerType === "mouse") {
                this.deleteVirtualId(event);
            }
        });

        // keyboard (OPTIONAL)
        m.mediaTouchDevice.addEventListener("change", ()=>{
            if (m.isTouchDevice) {
                document.removeEventListener("keydown", this.handleEventKeyDown);
                document.removeEventListener("keyup", this.handleEventKeyUp);
            }
            else {
                document.addEventListener("keydown", this.handleEventKeyDown);
                document.addEventListener("keyup", this.handleEventKeyUp);
            }
            console.log("media query changed");
        });
        if (!m.isTouchDevice) {
            document.addEventListener("keydown", this.handleEventKeyDown);
            document.addEventListener("keyup", this.handleEventKeyUp);
        }
        document.addEventListener("custom-switchgamefocus", ()=>{
            if (!UI.gameIsFocused) {
                for (const code of m.keyboardCodes.keys()) {
                    m.simulateKeyUp(code);
                }
            }
            console.log("event custom-switchgamefocus triggered");
        });

        // input fields
        if (document.querySelectorAll("#g-divCanvasElements input, #g-divCanvasElements textarea").length > 0) {
            els.divCanvasElements.addEventListener("change", function(event){
                (<HTMLElement>event.target).blur();
            }, true);
            els.divCanvasElements.addEventListener("blur", function(event){
                m.isFocused = false;
                els.divCanvasPositioning.classList.remove("js-input-scrollable");
            }, true);
            els.divCanvasElements.addEventListener("focus", function(event){
                m.isFocused = true;
            }, true);
        }


        // event listeners for orientation detection and fullscreen toggle
        UI.setGameEvents();
    }
    //#endregion

    private onResize() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // calculate realScale
        const newRealScale = Math.min(screenWidth / this.LOGICAL_WIDTH, screenHeight / this.LOGICAL_HEIGHT);
        if (newRealScale !== m.realScale && newRealScale > 0.05) {
            m.resolutionHasChanged = true; // later - false
            m.realScale = newRealScale;

            const newWidth = Math.floor(sf(this.LOGICAL_WIDTH));
            const newHeight = Math.floor(sf(this.LOGICAL_HEIGHT));

            this.SCALED_WIDTH = newWidth;
            this.SCALED_HEIGHT = newHeight;

            // resize divCanvas
            els.divCanvas.style.width = `${Math.floor(newWidth/m.dp)}px`;
            els.divCanvas.style.height = `${Math.floor(newHeight/m.dp)}px`;
            this.canvas.style.width = `${Math.floor(newWidth/m.dp)}px`;
            this.canvas.style.height = `${Math.floor(newHeight/m.dp)}px`;

            // resize canvas
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;

            this.cacheSubcanvasImages();

            // scale elements
            els.divCanvasElements.style.transform = `scale(${newRealScale/m.dp})`;
        }
        // calculate position of divCanvas
        {
            const divCanvasClientRect = els.divCanvas.getBoundingClientRect();
            this.divCanvasPos.x = divCanvasClientRect.x;
            this.divCanvasPos.y = divCanvasClientRect.y;
        }
    }

    private cacheSubcanvasImages() {
        for (const imageName in gatheredAssets.images) {
            gatheredAssets.subcanvasImages[imageName].v = this.imageToSubcanvas(gatheredAssets.images[imageName].v, m.scaleFactor);
        }
    }
    private imageToSubcanvas(image: HTMLImageElement, scaleFactor=1) {
        const subcanvas = F.createCanvas(Math.ceil(image.naturalWidth*scaleFactor), Math.ceil(image.naturalHeight*scaleFactor));
        const subctx = subcanvas.getContext("2d")!;
        subctx.scale(scaleFactor, scaleFactor);
        subctx.drawImage(image, 0, 0);
        return subcanvas;
    }
}
//#endregion
export const screen = new Screen();
