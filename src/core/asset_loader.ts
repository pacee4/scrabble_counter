import { soundManager } from '@/core/sound_manager';
import { showEl, hideEl } from '@/dom';

export let error = false;

//! DEFINITION OF DATA TYPES AND INTERFACES


export interface RendererProps { // "props" means "properties".
    v: HTMLImageElement | HTMLCanvasElement,
    /**
     * The natural width of the sprite's image.
     */
    readonly width: number,
    /**
     * The natural height of the sprite's image.
     */
    readonly height: number,
    readonly scalable: boolean
}
export interface ImageProps extends RendererProps {
    v: HTMLImageElement,
    readonly scalable: true
}
export interface CanvasProps extends RendererProps {
    v: HTMLCanvasElement,
    readonly scalable: false
}


export interface HitboxParameters {
    /**
     * The offset by X from the sprite.
     */
    offsetX: number,
    /**
     * The offset by Y from the sprite.
     */
    offsetY: number,
    /**
     * The width of the hitbox.
     */
    width: number,
    /**
     * The height of the hitbox.
     */
    height: number,

    calculateOriginPoint?: boolean,

    matrix?: Uint8Array
}
export interface MaskParameters extends HitboxParameters {
    matrix: Uint8Array
}


export interface ResourcesToLoad {
    images?: {[index: string]: string},
    audio?: {[index: string]: string},
    fonts?: {[index: string]: string[]},
    files?: {[index: string]: string},

    masks: ReadonlyArray<string>;
    subcanvasImagesBlacklist: ReadonlyArray<string>;

    audioVolumeNodes?: string[]
}
interface Source {
    type: "image"|"audio"|"font"|"file",
    name: string,
    source: string
}
interface ImageResource {
    type: "image",
    name: string,
    v: ImageProps
}
interface AudioResource {
    type: "audio",
    name: string,
    v: AudioBuffer
}
interface FontResource {
    type: "font"
}
interface FileResource {
    type: "file",
    name: string,
    v: string
}
export const gatheredAssets = {
    images: <{[index: string]: ImageProps}> {},
    files: <{[index: string]: string}> {},
    masks: <{[index: string]: MaskParameters}> {},
    
    subcanvasImages: <{[index: string]: CanvasProps}> {}
};


export async function loadAssets(resourcesToLoad: ResourcesToLoad){
    const resourcesToLoadA: Source[] = [];
    if (resourcesToLoad.images) {
        for (let index in resourcesToLoad.images) {
            resourcesToLoadA.push({
                type: "image",
                name: index,
                source: resourcesToLoad.images[index]
            });
        }
    }
    if (resourcesToLoad.audio) {
        for (let index in resourcesToLoad.audio) {
            resourcesToLoadA.push({
                type: "audio",
                name: index,
                source: resourcesToLoad.audio[index]
            });
        }
    }
    if (resourcesToLoad.fonts) {
        for (let index in resourcesToLoad.fonts) {
            const sources = resourcesToLoad.fonts[index];
            for (let source of sources) {
                resourcesToLoadA.push({
                    type: "font",
                    name: index,
                    source: source
                });
            }
        }
    }
    if (resourcesToLoad.files) {
        for (let index in resourcesToLoad.files) {
            resourcesToLoadA.push({
                type: "file",
                name: index,
                source: resourcesToLoad.files[index]
            });
        }
    }

    
    const els = {
        progressBarValue: <HTMLDivElement>document.getElementById("g-progressBarValue"),
        progressBarText: <HTMLDivElement>document.getElementById("g-progressBarText"),
        progressBarError: <HTMLDivElement>document.getElementById("g-progressBarError")
    };

    let resourcesLoadedCount = 0;
    const resourcesCount = resourcesToLoadA.length+1;
    function updateProgressBar() {
        if (!error) {
            resourcesLoadedCount+=1;

            const percent = resourcesLoadedCount/resourcesCount*100;
            els.progressBarText.textContent = `Загрузка... ${Math.floor(percent)}%`;

            els.progressBarValue.style.width = `${percent}%`;
        }
    }


    function addResourcesToLoad(resourcesToLoadA: Source[]) {
        function promiseImage(name: string, url: string): Promise<ImageResource> {
            return new Promise((resolve, reject)=>{
                const image: HTMLImageElement = new Image();
                image.onload = ()=>{
                    updateProgressBar();
                    resolve({
                        type: "image",
                        name: name,
                        v: {
                            v: image,
                            width: image.naturalWidth,
                            height: image.naturalHeight,
                            scalable: true
                        }
                    });
                };
                image.onerror = ()=>{
                    displayError(url);
                    reject(Error(`Cannot load image: ${url}`));
                }
                image.src = url;
            });
        }
        function promiseFont(name: string, url: string): Promise<FontResource> {
            return new Promise((resolve, reject) => {
                const font = new FontFace(name, `url(${url})`);

                font.load()
                .then(loadedFont => {
                    updateProgressBar();
                    document.fonts.add(loadedFont);
                    resolve({
                        type: "font"
                    });
                })
                .catch(() => {
                    displayError(url);
                    reject(Error(`Cannot load font: ${url}`));
                });
            });
        }
        async function promiseAudio(name: string, url: string): Promise<AudioResource> {
            try{
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`${url}: ${response.status} ${response.statusText}`);
                }
                {
                    const contentType = response.headers.get("content-type");
                    if (!contentType || !contentType.startsWith("audio/")) {
                        throw new Error(`Cannot load audio: ${url}`);
                    }
                }

                const arrayBuffer = await response.arrayBuffer();
                const soundBuffer = await soundManager.audioCtx!.decodeAudioData(arrayBuffer);
                updateProgressBar();
                return {
                    type: "audio",
                    name: name,
                    v: soundBuffer
                }
            }
            catch(error) {
                displayError(url);
                throw error;
            }
        }

        const promises: Promise<ImageResource|AudioResource|FontResource|FileResource>[] = [];
        for (let source of resourcesToLoadA) {
            if (source.type === "image") {
                promises.push(promiseImage(source.name, source.source));
            }
            if (source.type === "font") {
                promises.push(promiseFont(source.name, source.source));
            }
            if (source.type === "audio" && soundManager.audioCtx) {
                promises.push(promiseAudio(source.name, source.source));
            }
        }
        return promises;
    }

    updateProgressBar(); // including this JavaScript file

    const resourcesLoadedA = await Promise.all(addResourcesToLoad(resourcesToLoadA));
    for (let resource of resourcesLoadedA) {
        if (resource.type === "image") {
            gatheredAssets.images[resource.name] = resource.v;
        }
        if (resource.type === "audio") {
            soundManager.audio[resource.name] = resource.v;
        }
    }
}

export function displayError(reason: string) {
    if (!error) {
        error = true;
        const elProgressBarError = document.getElementById("g-progressBarError")!;

        showEl(document.getElementById("g-divProgressBar")!);
        hideEl(document.getElementById("g-divGame")!);
        showEl(elProgressBarError);

        document.getElementById("g-progressBarText")!.textContent = "Ошибка загрузки";
        elProgressBarError.textContent = reason;
    }
}