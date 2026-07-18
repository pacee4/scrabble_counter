import { gatheredAssets, registerImageKey } from "@/core/asset_loader";
import { ChipMultiplier, g } from "@/editable/global_properties";

import { SChip } from "./sprites";
import { Sprite } from "@/core/base_classes";


export class ChipMaker {
    private readonly CHIP_COLOR_NAMES: Readonly<Record<number, ("red"|"amber"|"green"|"teal")>> = {
        20: "red",
        24: "green",
        25: "teal",
        26: "green",
        29: "amber",
        30: "amber"
    }; 
    private readonly CHIP_COLORS_BASE = {
        "red": "#AD343C",
        "amber": "#CC9030",
        "green": "#22704A",
        "teal": "#51BCAA",
        "snowy": "#C7C3D1"
    }
    private readonly CHIP_COLORS_SHADOWS = {
        "red": "#561A1E",
        "amber": "#664818",
        "green": "#113825",
        "teal": "#285E55",
        "snowy": "#787386"
    }
    
    readonly LETTER_VALUES = [
        1, 3, 1, 3, 2, 1, 5, 5,
        1, 4, 2, 2, 2, 1, 1, 2,
        1, 1, 1, 2, 8, 5, 5, 5,
        8, 10,10,4, 3, 8, 10,3
    ];
    readonly RUSSIAN_LETTERS = "абвгдежзийклмнопрстуфхцчшщъыьэюя";
    getLetterN(letter: string) {
        return this.RUSSIAN_LETTERS.indexOf(letter);
    }

    private elTemplate;
    private svgChipBasisTemplate!: SVGSVGElement;
    private imgBlobUrls = new Map<string, string>();

    constructor() {
        this.elTemplate = document.createElement("template");
        this.elTemplate.id = "tmpl-chipComponents";
    }

    public init() {
        // Process resources for storage in an HTML document
        for (const tmplName in gatheredAssets.files) {
            if (tmplName.startsWith("tmpl-chip-")) {
                // MAY NOT BE NEEDED
                /* 
                const codeType = <'L'|'N'|'B'> tmplName.slice(10, 11);
                const number = parseInt(tmplName.slice(11));
                */
                
                const textSvg = gatheredAssets.files[tmplName];

                // Convert text to an independent SVG element
                const doc = new DOMParser().parseFromString(textSvg, "image/svg+xml");
                
                const elSvg = doc.querySelector("svg")!;
                if (import.meta.env.DEV) {
                    if (!elSvg) throw new Error(`preloadSVG(): no SVG: ${tmplName}`);
                }
                elSvg.id = tmplName;

                this.elTemplate.content.appendChild(elSvg);
            }
        }
        // Store them hidden inside an HTML document
        document.body.appendChild(this.elTemplate);

        this.svgChipBasisTemplate = this.elTemplate.content.getElementById("tmpl-chip-B1") as any;
    }

    private makeMultiplier(multiplier: number): HTMLImageElement|null {
        const imageSrc = ChipMultiplier.LITERALS[(multiplier % 5)];
        
        if (imageSrc) {
            const imgMultiplier = document.createElement("img");
            imgMultiplier.classList.add("multiplier");
            imgMultiplier.draggable = false;
            imgMultiplier.src = `assets/chips/multipliers/${imageSrc}.svg`;
            imgMultiplier.alt = "";
            return imgMultiplier;
        }
        else {
            return null;
        }
    }

    private makeSvgChip(letter: string, white=false) {
        const letterN = this.getLetterN(letter);

        const letterValue = (white) ? 0 : this.LETTER_VALUES[letterN];
        const colorName = 
            (letterValue <= 0)
            ? "snowy"
            : (this.CHIP_COLOR_NAMES[letterN])
            ? (this.CHIP_COLOR_NAMES[letterN])
            :
                (letterValue <= 1) ? "green"
                : (letterValue <= 2) ? "teal"
                : (letterValue <= 4) ? "amber"
                : "red";


        // Chip basis
        //#region
        const svgChipBasis = this.svgChipBasisTemplate.cloneNode(true) as SVGSVGElement;
        // clear ID
        svgChipBasis.id = "";
        svgChipBasis.classList.add("chip");

        const svgChipBasisInner = svgChipBasis.getElementsByClassName("g")[0];
        const pathLetter = (
            this.elTemplate.content.getElementById(`tmpl-chip-L${letterN}`)!
            .cloneNode(true) as Element)
            .querySelector("path")!;
        const pathLetterShadow = pathLetter.cloneNode(true) as typeof pathLetter;
        const pathLetterValue = (
            this.elTemplate.content.getElementById(`tmpl-chip-N${letterValue}`)!
            .cloneNode(true) as Element)
            .querySelector("path")!;

        (svgChipBasisInner.getElementsByClassName("base")[0] as SVGPathElement)
            .style.fill = this.CHIP_COLORS_BASE[colorName];
        (svgChipBasisInner.getElementsByClassName("letter-value-base")[0] as SVGPathElement)
            .style.fill = this.CHIP_COLORS_SHADOWS[colorName];
        //#endregion

        // letter
        if (letterValue >= 7) {
            pathLetter.style.fill = 'url("#yellow-gradient")';
        }
        else {
            pathLetter.style.fill = "#ffffff";
            svgChipBasis.querySelector("defs")?.remove();
        }

        // shadow
        pathLetterShadow.setAttribute("transform", "translate(5 5)");
        pathLetterShadow.style.fill = this.CHIP_COLORS_SHADOWS[colorName];

        // letter value
        pathLetterValue.style.fill = "#ffffff";
    
        // add child elements
        svgChipBasisInner.appendChild(pathLetterShadow);
        svgChipBasisInner.appendChild(pathLetter);
        svgChipBasisInner.appendChild(pathLetterValue);
        
        return svgChipBasis;
    }

    public async chipsToImages() {
        const promises: Promise<{
            img: HTMLImageElement,
            name: string
        }>[] = [];

        this.imgBlobUrls.forEach((url)=>{
            URL.revokeObjectURL(url);
        })
        this.imgBlobUrls.clear();

        for (const white of [false, true]) {
            Array.from(this.RUSSIAN_LETTERS).forEach((letter, i)=>{
                promises.push( new Promise((resolve)=>{
                    // 1. Make a chip
                    const svgChipBasis = this.makeSvgChip(letter, white);
                    
                    // 2. Convert an SVG element to XML
                    const xmlString = new XMLSerializer().serializeToString(svgChipBasis);
                    
                    // 3. Create a Blob out of a string
                    const blob = new Blob([xmlString], {type: "image/svg+xml;charset=utf-8"});
                    const url = URL.createObjectURL(blob);

                    {
                        // 4. Add the Blob URL into the map
                        const name = `chip-${(white) ? "W" : ""}${i}`;
                        this.imgBlobUrls.set(name, url);

                        // 5. Load an image
                        const img = new Image();
                        img.onload = () => {
                            resolve({
                                img: img,
                                name: name
                            });
                        }
                        img.src = url;
                    }
                }) );
            });

        }

        // Add images to the loaded resources object
        (await Promise.all(promises)).forEach((imgProp)=>{
            registerImageKey(imgProp.name, imgProp.img);
        });
    }

    public generateChips(word: string, multipliers: string, x: number, y: number, size: number, gap: number) {
        const chips: Sprite[] = [];
        
        const scaleChip = size/99;
        let currentX = x;
        for (let i = 0; i < word.length; i++) {
            const white = (multipliers[i]) ? (parseInt(multipliers[i]) >= 5) : false;
            const chip = new SChip(currentX, y, word[i], white);
            chip.scaleTo(scaleChip);
            chips.push(chip);

            currentX += size + gap;
        }
        return chips;
    }

    public generateChips2(word: string, multipliers: string, centerX: number, centerY: number, size: number, gap: number, maxWidth: number) {
        const chips: Sprite[] = [];
        
        const origSize = 99;
        const initScale = size/origSize;
        const origGap = gap / initScale;
        const width = (word.length * origSize) + ((word.length-1) * origGap);
        
        const scaleChip = Math.min(initScale, maxWidth/width);

        let currentX = centerX - (((width/2) - (origSize/2))*scaleChip);

        for (let i = 0; i < word.length; i++) {
            const white = (multipliers[i]) ? (parseInt(multipliers[i]) >= 5) : false;
            const chip = new SChip(currentX, centerY, word[i], white);
            chip.setAnchorPoint(0.5, 0.5);
            chip.scaleTo(scaleChip);
            chips.push(chip);

            const multiplierN = parseInt(multipliers[i]) % 5;
            if (multiplierN !== 0) {

                const multiplierSprite = new Sprite(
                    currentX,
                    centerY+((scaleChip*origSize)/2),
                    ChipMultiplier.LITERALS[multiplierN]+"-m"
                );
                
                multiplierSprite.setAnchorPoint(0.5, 0.5);
                multiplierSprite.scaleTo(scaleChip * 1.5);
                chips.push(multiplierSprite);
            }

            currentX += (origSize+origGap) * scaleChip;
        }
        return chips;
    }

    public makeChipsF(word: string) {
        const f = document.createDocumentFragment();
        
        for (let i = 0; i < word.length; i++) {
            const white = false;
            const letter = word[i];

            // console.log(`chip-${(white) ? "W" : ""}${this.getLetterN(letter)}: ${this.imgBlobUrls.get(`chip-${(white) ? "W" : ""}${this.getLetterN(letter)}`)}`);

            const img = new Image();
            img.width = 99;
            img.height = 99;

            img.loading = "lazy";
            img.src = this.imgBlobUrls.get(`chip-${(white) ? "W" : ""}${this.getLetterN(letter)}`) ?? "./assets/html_used/empty_chip.svg";

            f.appendChild(img);
        }

        return f;
    }
}
