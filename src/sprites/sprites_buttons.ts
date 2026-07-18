import * as F from "@/core/functions";
import * as C from "@/editable/custom";
import { CtxToolkit } from "@/editable/custom";
import { m, messages, sf, sfR } from "@/core/sensing_properties";
import { g, type MoveDataWithScore } from "@/editable/global_properties";

import { ACompCollidable, CompHitbox, CompMask, Sprite, type Ctx2D } from "@/core/base_classes";
import { Msg } from "@/editable/msg";
import { settings } from "@/editable/settings";

import { s } from "./storage";
import { gatheredAssets } from "@/core/asset_loader";
import { o } from "./html_elements";

export abstract class SAButton extends Sprite {
    abstract clickHitbox: ACompCollidable;
    abstract click: C.CompClickable<this>;
    disabled = false;

    /** @default Msg.TICK_CLICK */
    clickMsg: Msg = Msg.TICK_CLICK;
    
    constructor(
        x: number,
        y: number,
        public clickAction: ()=>void = ()=>{}
    ) {
        super(x, y);

        this.setAnchorPoint(0.5, 0.5);
    }

    messageStep(message: Msg): void {
        switch (message) {
            case this.clickMsg:
                if (!this.disabled) {
                    this.click.tickClick();
                }
                break;

            case Msg.TICK_LOGIC:
                if (!this.disabled) {
                    this.click.processClick();
                }
                break;
        }
    }
}


export function subFillButton(sprite: Sprite, width: number, height: number, path: Path2D) {
    return new C.AutoSubcanvas(sprite, width, height, (sctx, backgroundColor: string, darken: boolean)=>{
        sctx.fillStyle = backgroundColor;
        sctx.fill(path);

        if (darken) {
            sctx.fillStyle = "#0000004d"; // 30% opacity, like 70% brightness filter used in CSS
            sctx.fill(path);
        }
    });
}

/**
 * - Complex sprite
 */
export class SRoundedLabelButtons extends SAButton {
    static readonly SIZE_PRESETS = {
        "1": [178, 59],
        "2": [140, 35],
        "3": [154, 35]
    }

    /** fill capsule */
    subFillCapsule;
    /** stroke capsule and text */
    subTopCapsule;

    maxFontSizePt;
    clickHitbox; click;
    path;

    backgroundColor: string;
    text: string;

    constructor(p: {
        x: number,
        y: number,
        sizePreset: keyof typeof SRoundedLabelButtons.SIZE_PRESETS,
        text?: string,
        backgroundColor?: string,
        clickAction: ()=>void
    }) {
        super(p.x, p.y, p.clickAction);
        this.backgroundColor = p.backgroundColor ?? "white";
        this.text = p.text ?? "";

        this.maxFontSizePt = (p.sizePreset === "1") ? "16pt" : "14pt";
        
        const [width, height] = SRoundedLabelButtons.SIZE_PRESETS[p.sizePreset];
        this.width = width;
        this.height = height;
        this.setAnchorPoint(0.5, 0.5);

        // Define path
        const hlw = 1.5;
        this.path = CtxToolkit.defineCapsule(hlw, hlw, width-hlw*2, height-hlw*2);

        // Sub-canvases
        this.subFillCapsule = subFillButton(this, width, height, this.path);

        this.subTopCapsule = new C.AutoSubcanvas(this, width, height, (sctx, text: string)=>{
            // stroke
            sctx.lineWidth = hlw*2;
            sctx.strokeStyle = "black";
            sctx.stroke(this.path);
            
            // text
            sctx.fillStyle = "black";

            sctx.font = `${this.maxFontSizePt} ${g.FONT_STACK}`;
            sctx.textAlign = "center";
            sctx.textBaseline = "middle";

            const textWidth = sctx.measureText(text).width;
            const scaleRatio = Math.min((width-10)/textWidth, 1);
            sctx.translate(width/2, (height/2)+1);
            sctx.scale(scaleRatio, scaleRatio);

            sctx.fillText(text, 0, 0);
        });

        // Hitbox and click
        this.clickHitbox = new CompMask(this, gatheredAssets.masks[`button-mask-${p.sizePreset}`]);
        this.click = new C.CompClickable(this, this.clickHitbox, p.clickAction);
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.TICK_AFTER:
                this.subFillCapsule.update(this.backgroundColor, this.click.focused);
                this.subTopCapsule.update(this.text);
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        this.subFillCapsule.display(ctx);
        this.subTopCapsule.display(ctx);
    }
}
/**
 * - Complex sprite
 */
export class SRoundedIconButtons extends SAButton {
    clickHitbox; click;
    path: Path2D;

    /** fill capsule */
    subFill;
    /** stroke capsule and text */
    subStroke;

    backgroundColor: string;

    protected iconImg;

    constructor(p: {
        x: number,
        y: number,
        width: number,
        height: number,
        /** `-1` for capsule path */
        radius: number,
        thickness?: number,
        iconKey: string,
        backgroundColor: string,
        clickAction: ()=>void
    }) {
        super(p.x, p.y);
        this.backgroundColor = p.backgroundColor;
        this.iconImg = gatheredAssets.subcanvasImages[p.iconKey];

        this.width = p.width;
        this.height = p.height;
        this.setAnchorPoint(0.5, 0.5);

        // Define path
        const hlw = (p.thickness ?? 3) / 2;

        if (p.radius > -1) {
            this.path = CtxToolkit.defineRoundedRect(hlw, hlw, p.width-hlw*2, p.height-hlw*2, p.radius);
        }
        else {
            this.path = CtxToolkit.defineCapsule(hlw, hlw, p.width-hlw*2, p.height-hlw*2);
        }

        
        // Sub-canvases
        this.subFill = subFillButton(this, p.width, p.height, this.path);

        this.subStroke = new C.AutoSubcanvas(this, p.width, p.height, (sctx)=>{
            // stroke
            sctx.lineWidth = hlw*2;
            sctx.strokeStyle = "black";
            sctx.stroke(this.path);
        });

        // Hitbox and click
        this.clickHitbox = new CompHitbox(this);
        this.click = new C.CompClickable(this, this.clickHitbox, p.clickAction);
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.TICK_AFTER:
                this.subFill.update((this.disabled) ? g.COLOR_PALETTE.disabled : (this.backgroundColor), this.click.focused);
                this.subStroke.update();
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        this.subFill.display(ctx);
        this.subStroke.display(ctx);

        // draw icon
        ctx.translate(
            sfR((this.width-this.iconImg.width)/2),
            sfR((this.height-this.iconImg.height)/2),
        );
        ctx.drawImage(this.iconImg.v, 0, 0);
    }
}

/**
 * - Mute clone (accessible via message broadcast)
 */
export class SRoundedButtonMakeMove extends SRoundedLabelButtons {
    buttonText = "";
    new = false; // receive messages right when the sprite is created

    constructor() {
        super({
            x: 540, y: 315,
            sizePreset: "3", backgroundColor: g.COLOR_PALETTE.lightGolden,
            clickAction: ()=>{
            if (this.text === "Сделать ход"||this.text === "Пропустить ход") {
                s.make_move_controller.confirmMove();
            }
            else if (this.text === "Добавить слово") {
                if (s.word_controller.checkWord()) {
                    s.make_move_controller.addWordItem();
                }
                else {
                    s.word_controller.warnNoSuchWord();
                }
            }
            else if (this.text === "Всё равно добавить") {
                s.make_move_controller.addWordItem();
            }
        }});
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.UPDATE_MOVE_STATE_BUTTON:
                if (s.word_controller.word.length === 0) {
                    if (s.make_move_controller.newMove.words.length > 0) {
                        this.text = "Сделать ход";
                    }
                    else {
                        this.text = "Пропустить ход";
                    }
                }
                else if (s.word_controller.word.length === 1) {
                    this.text = "Слишком короткое слово...";
                }
                else if (s.word_controller.stateNoSuchWord) {
                    this.text = "Всё равно добавить";
                }
                else {
                    this.text = "Добавить слово";
                }

                this.disabled = (this.text === "Слишком короткое слово...");
                this.backgroundColor = (this.disabled ? g.COLOR_PALETTE.disabled : g.COLOR_PALETTE.lightGolden);

                break;

            case Msg.SUBMIT_CLICK_BUTTON:
                this.clickAction();
                break;
        }
    }
}

/**
 * - Mute clone (accessible via message broadcast)
 */
export class SRoundedButtonFinishGame extends SRoundedLabelButtons {
    buttonText = "";
    new = false; // receive messages right when the sprite is created

    constructor() {
        super({
            x: 540, y: 315,
            sizePreset: "3", backgroundColor: g.COLOR_PALETTE.lightOrange,
            clickAction: ()=>{
                if (this.text === "Дальше") {
                    s.finish_game_controller.nextPlayer();
                }
                else {
                    s.finish_game_controller.finishGame();
                }
            }
        });
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.UPDATE_FINISH_STATE:
                if (s.finish_game_controller.playerI >= g.playerList.length-1) {
                    this.text = "Завершить игру";
                }
                else {
                    this.text = "Дальше";
                }
                break;

            case Msg.SUBMIT_CLICK_BUTTON:
                this.clickAction();
                break;
        }
    }
}

/**
 * - Mute clone
 */
export class SCheckboxes extends SAButton {
    clickHitbox: ACompCollidable;
    click;
    checked = false;

    constructor(
        x: number,
        y: number,
        public readonly type: "checkbox",
        clickAction: ()=>void = ()=>{
            this.checked = !this.checked;
        }
    ) {
        super(x, y, clickAction);
        this.setImageKey(type);
        this.setAnchorPoint(0.5, 0.5);

        this.scaleTo(0.5);
        
        this.clickHitbox = new CompMask(this, gatheredAssets.masks[type], true);
        this.click = new C.CompClickable(this, this.clickHitbox, this.clickAction);
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.TICK_AFTER:
                this.setImageKeyTick(this.type + (this.click.focused?"-p":"") + (this.checked?"-checked":""));
                break;
        }
    }
}

// in stage: `makeMove`
export class SMultiplierButtons extends SAButton {
    clickHitbox: ACompCollidable;
    click;
    checked!: boolean;
    
    constructor(
        x: number,
        y: number,
        public readonly type: "letter_x2"|"letter_x3"|"word_x2"|"word_x3"
    ) {
        super(x, y);
        this.setImageKey(type);
        this.setAnchorPoint(0.5, 0.5);

        this.clickAction = ()=>{
            s.word_controller.pickMultiplier(this.type);
        }

        this.clickHitbox = new CompMask(this, gatheredAssets.masks[type], true);
        this.click = new C.CompClickable(this, this.clickHitbox, this.clickAction);
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.TICK_AFTER:
                this.setImageKeyTick(this.type + (this.click.focused?"-p":"") + (this.checked?"-checked":""));
                break;
        }
    }

    updateState() {
        if (this.type === s.word_controller.selectedMultiplier) {
            this.checked = true;
        }
        else {
            this.checked = false;
        }
    }
}
/**
 * - Mute clone
 */
export class SStarButton extends SAButton {
    clickHitbox: ACompCollidable;
    click;
    checked!: boolean;

    constructor() {
        super(37.5, 187.5);
        this.setImageKey("star");
        this.setAnchorPoint(0.5, 0.5);

        this.updateState();

        this.clickAction = ()=>{
            s.word_controller.pickStar(true);
        }

        this.clickHitbox = new CompHitbox(this, {x: -22, y: -22, width: 44, height: 44});
        this.click = new C.CompClickable(this, this.clickHitbox, this.clickAction);
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.TICK_AFTER:
                this.setImageKeyTick("star" + (this.click.focused?"-p":"") + (this.checked?"-checked":""));
                break;
        }
    }

    updateState() {
        this.checked = s.word_controller.selectedStar;
    }
}
/**
 * - Mute clone
 * - Complex sprite
 */
export class SKeys extends Sprite {
    // controller
    static readonly LAYOUT = [
        "йцукенгшщзхъ", "фывапролджэ", "ячсмитьбю"
    ];
    static readonly ROW_OFFSET_X = [
        2, 14, 34
    ];
    static readonly OFFSET_X = 8;
    static readonly OFFSET_Y = 228;

    static createKeyboard() {
        for (let row = 0; row < this.LAYOUT.length; row++) {
            const rowLayout = this.LAYOUT[row];

            for (let col = 0; col < rowLayout.length; col++) {
                const char = rowLayout[col];
                const x = this.ROW_OFFSET_X[row] + (col * 36) + this.OFFSET_X;
                const y = this.OFFSET_Y + row * 36;

                s.keyboard_panel.add(new SKeys(x, y, char));
            }
        }
    }

    // instance
    clickHitbox;
    subLetter;

    pressed = false;

    constructor(x: number, y: number, private readonly char: string) {
        super(x, y);
        this.setImageKey("key");

        this.subLetter = new C.AutoSubcanvas(this, 32, 32, (sctx)=>{
            sctx.textAlign = "center";
            sctx.textBaseline = "middle";
            sctx.font = `20pt ${g.FONT_STACK}`;
            sctx.fillStyle = "black";
            
            sctx.fillText(char.toUpperCase(), 16, 18);
        });

        this.clickHitbox = new CompHitbox(this, {x: 0, y: 0, width: 34, height: 34});
    }

    private clickAction() {
        s.word_controller.addChip(this.char);
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_CLICK:
                if (this.pressed && !m.pointerIsDown(0)) {
                    this.clickAction();
                }
                this.pressed = this.clickHitbox.collidePointer(0);
                break;

            case Msg.TICK_AFTER:
                this.setImageKeyTick("key"+(this.pressed?"-p":""));
                this.subLetter.update();
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        const preservedTransformation = ctx.getTransform();
        ctx.scale(1/3, 1/3);
        this.drawSelf(ctx);
        ctx.setTransform(preservedTransformation);
        ctx.translate(sfR(1), sfR(1));
        this.subLetter.display(ctx);
    }
}
/**
 * - Mute clone
 */
export class SBackspaceButton extends SAButton {
    clickHitbox: ACompCollidable;
    click: C.CompClickable<this>;

    pressDuration = 0;
    
    constructor() {
        super(402, 199, ()=>{
            s.word_controller.eraseChip();
        });

        this.setImageKey("backspace");
        this.setAnchorPoint(0.5, 0.5);

        this.clickHitbox = new CompMask(this, gatheredAssets.masks["backspace"]);
        this.click = new C.CompClickable(this, this.clickHitbox, this.clickAction);
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.TICK_LOGIC:
                if (this.click.pressed) {
                    this.pressDuration += m.delta;

                    // erase all chips
                    if (this.pressDuration >= 1) {
                        s.word_controller.eraseAllChips();
                        this.click.pressed = false;
                        this.click.focused = false;
                    }
                }
                if (!this.click.pressed) {
                    this.pressDuration = 0;
                }
                break;

            case Msg.TICK_AFTER:
                this.setImageKeyTick("backspace" + (this.click.focused?"-p":""));
                break;
        }
    }
}


/**
 * - Mute clone
 */
export class SRoundedButtonLoadTable extends SRoundedLabelButtons {
    constructor() {
        super({
            x: (320+100), y: 320, sizePreset: "1", text: "Загрузить табло", backgroundColor: g.COLOR_PALETTE.lightCyan,
            clickAction: ()=>{
                if (o.inputFields.lengthIsEqual()) {
                    g.loadStorageData("tableData");
                    messages.broadcast(Msg.START_GAME);
                }
                else {
                    // reset player HTML input fields state
                    o.inputFields.destroyInner();
                    o.inputFields.createInner();
                }
            }
        });
    }
    
    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.UPDATE_LOAD_TABLE_BUTTON:
                if (!o.inputFields.lengthIsEqual()) {
                    this.backgroundColor = g.COLOR_PALETTE.darkCyan;
                    this.text = "Вернуть";
                }
                else {
                    this.backgroundColor = g.COLOR_PALETTE.lightCyan;
                    this.text = "Загрузить табло";
                }
                break;
        }
    }
}