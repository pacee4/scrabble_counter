import * as F from "@/core/functions";
import * as C from "@/editable/custom";
import { CtxToolkit } from "@/editable/custom";
import { m, messages, sf, sfR } from "@/core/sensing_properties";
import { g, type MoveDataWithScore } from "@/editable/global_properties";
import { CtxToolkit } from "@/editable/custom";
import { m, messages, sf, sfR } from "@/core/sensing_properties";
import { g, type MoveDataWithScore } from "@/editable/global_properties";

import { ACompCollidable, CompHitbox, CompMask, Sprite, type Ctx2D } from "@/core/base_classes";
import { ACompCollidable, CompHitbox, CompMask, Sprite, type Ctx2D } from "@/core/base_classes";
import { Msg } from "@/editable/msg";
import { settings } from "@/editable/settings";

import { s } from "./storage";
import { gatheredAssets } from "@/core/asset_loader";
import { SRoundedIconButtons } from "./sprites_buttons";



export class SBackground extends Sprite {
    constructor() {
        super(0, 0, "background");
    }
}
export class SBackgroundParticles extends Sprite {

    duration = 2;
    lifetime = this.duration;
    
    targetScale = F.randomNumber(1, 1.6, 0.1);

    constructor(x: number, y: number) {
        super(x, y, `background_particle-${
            F.randomNumber(0, 1) ? 1 : F.randomNumber(2, 3)
        }`);
        this.setAnchorPoint(0.5, 0.5);

        this.new = false; // call messageStep right after creation
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK:
                this.lifetime -= m.delta;
                if (this.lifetime <= 0) {
                    this.delete = true;
                }
                else {
                    this.scaleTo(
                        F.ease(F.scale(this.lifetime, this.duration, 0, 0, 1), "sineOut") * this.targetScale
                    );

                    this.opacity = F.scale(this.lifetime, this.duration, 0, 1, 0);
                }
                break;
        }
    }
}

/** 
 * - Persistent
 */
export class SMidground extends Sprite {
    readonly stages: string[] = ["table", "makeMove", "timer", "moveInfo", "help", "finishGame"];
    constructor() {
        super(0, 0);
    }

    changeMidgroundStage(key: string) {
        if (this.stages.includes(key)) {
            this.visible = true;
            this.setImageKey(`midground-${key}`);
        }
        else {
            this.visible = false;
        }
    }
}
/**
 * - Complex sprite
 * - Persistent
 */
export class SMidgroundText extends Sprite {
    sub;

    constructor() {
        super(0, 0);
        this.sub = new C.AutoSubcanvas(this, settings.SCREEN_WIDTH, settings.SCREEN_HEIGHT, 
            (sctx, stage: string)=>{
                switch (stage) {
                    case "mainMenu": {
                        // box
                        const path = CtxToolkit.defineRoundedRect(50, 120, 540, 70, 11);

                        sctx.fillStyle = g.COLOR_PALETTE.transPurple;
                        sctx.fill(path);

                        // text
                        sctx.font = `12pt ${g.FONT_STACK}`;
                        sctx.textAlign = "center";
                        sctx.textBaseline = "top";
                        sctx.fillStyle = "white";

                        CtxToolkit.wrapText(sctx, 
                            "Это приложение берёт от «лучшего» счетовода ответственность за подсчёт, запись очков и написание слов и заменяет блокнот, калькулятор и орфографический словарь.",
                            320, 130, 520, 1.1
                        );
                        break;
                    }

                    case "choosePlayers": {
                        // heading text
                        sctx.font = `bold 18pt ${g.FONT_STACK}`;
                        sctx.textAlign = "center";
                        sctx.textBaseline = "alphabetic";
                        sctx.fillStyle = g.COLOR_PALETTE.goldenText;

                        sctx.fillText("Введите имена игроков по порядку:", 320, 34);

                        break;
                    }

                    case "makeMove": {
                        // static text
                        sctx.font = `8.5pt ${g.FONT_STACK}`;
                        sctx.textAlign = "start";
                        sctx.textBaseline = "middle";
                        sctx.fillStyle = "#ffcc00";

                        CtxToolkit.wrapText(sctx,
                            `Использовали все фишки?\n+${g.settings.bonusPoints} ${F.sklonenieNoun(g.settings.bonusPoints, "очко", "очка", "очков")}`,
                            490, 191, 400, 1.2
                        );

                        break;
                    }
                }
            }
        );
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_AFTER:
                this.sub.update(g.stage);
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        this.sub.display(ctx);
    }
}

export class SChip extends Sprite {
    constructor(x: number, y: number, letter: string, white=false) {
        super(x, y, `chip-${(white) ? "W" : ""}${g.chipMaker.getLetterN(letter)}`);
    }
}

export class STitle extends Sprite {
    constructor() {
        super(320, 10, "title");
        this.scaleTo(0.5);
        this.setAnchorPoint(0.5, 0);
    }
}




/**
 * - Persistent
 * - Hidden first
 * - Complex sprite
 */
export class SMoveInfoBoard extends Sprite {
    subStaticLabel;
    subPointsForWord;
    subWordCount;
    
    constructor() {
        super(14, 224, "move_info_board");
        this.visible = false;

        // Static label text
        {
            const sub = new C.SubcanvasText(this, 100, 14);
            this.subStaticLabel = sub;

            sub.setTextAnchor("left");
            sub.ctx.font = `8.5pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "white";
            sub.text = "Счёт за слово:";
        }
        // Points for word
        {
            const sub = new C.SubcanvasText(this, 100, 20);
            this.subPointsForWord = sub;

            sub.setTextAnchor("left");
            sub.ctx.font = `12pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "white";
        }
        // Word status
        {
            const sub = new C.SubcanvasText(this, 158, 30);
            this.subWordCount = sub;

            sub.setTextAnchor("left");
            sub.ctx.font = `bold 18pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "black";
        }
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_AFTER:
                // update sub-canvases
                this.subStaticLabel.update();
                this.subPointsForWord.update();
                this.subWordCount.update();
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        this.drawSelf(ctx);

        ctx.translate(sfR(20), sfR(6));
        this.subStaticLabel.display(ctx);

        ctx.translate(sfR(0), sfR(12));
        this.subPointsForWord.display(ctx);

        ctx.translate(sfR(160), sfR(-11));
        this.subWordCount.display(ctx);
    }
}


/**
 * - Clone for `s.move_info_board_navigation_buttons`
 */
export class SMoveInfoBoardNavigationButtons extends SRoundedIconButtons {
    constructor(private readonly side: "left"|"right") {
        super({
            x: 366 + (side==="right" ? 30 : 0),
            y: 243,
            width: 28,
            height: 28,
            radius: 6,
            thickness: 1.75,
            backgroundColor: g.COLOR_PALETTE.lightGray,
            iconKey: "icon-"+side,
            clickAction: ()=>{
                this.clickAction2();
            }
        });

        this.visible = false;
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.UPDATE_MOVE_INFO_NAVIGATION_BUTTONS:
                if (s.move_info_controller.wordCount > 1) {
                    this.visible = true;
                    if (this.side === "left") {
                        this.disabled = (s.move_info_controller.wordI <= 0);
                    }
                    else {
                        this.disabled = (s.move_info_controller.wordI >= s.move_info_controller.wordCount-1);
                    }
                }
                else {
                    this.visible = false;
                }
                break;
        }
    }

    clickAction2() {
        if (this.side === "left") {
            s.move_info_controller.changeBoardWord(-1);
        }
        else {
            s.move_info_controller.changeBoardWord(1);
        }
    }
}


/**
 * - Clone for `s.help_navigation_buttons`
 */
export class SHelpNavigationButtons extends SRoundedIconButtons {
    constructor(private readonly side: "left"|"right") {
        super({
            x: 544 + (side==="right" ? 40 : 0),
            y: 38,
            width: 37,
            height: 37,
            radius: 6,
            thickness: 3,
            backgroundColor: g.COLOR_PALETTE.lightGray,
            iconKey: "icon-"+side,
            clickAction: ()=>{
                this.clickAction2();
            }
        });

        this.visible = false;
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.UPDATE_HELP_NAVIGATION_BUTTONS:
                if (s.help_controller.pageCount > 1) {
                    this.visible = true;
                    if (this.side === "left") {
                        this.disabled = (s.help_controller.pageN <= 0);
                    }
                    else {
                        this.disabled = (s.help_controller.pageN >= s.help_controller.pageCount-1);
                    }
                }
                else {
                    this.visible = false;
                }
                break;
        }
    }

    clickAction2() {
        if (this.side === "left") {
            s.help_controller.turnPageBy(-1);
        }
        else {
            s.help_controller.turnPageBy(1);
        }
    }
}



/** 
 * - Used in stage `table`
 * - Complex sprite
 * - Persistent
 */
export class SPlayerTurnTextInfo extends Sprite {
    subRoundNumber;
    subCurrentPlayerTurn;
    subStaticBottom;

    constructor() {
        super(0, 0);
        this.visible = false;

        // Round number
        {
            const sub = new C.SubcanvasText(this, 170, 22);
            this.subRoundNumber = sub;

            sub.setTextAnchor("center");

            // render text with inner and outer shadows
            sub.renderFunc = (sctx)=>{
                sctx.font = `bold 12pt ${g.FONT_STACK}`;
                // inner shadow
                sctx.fillStyle = "#c04000";
                sub.fillText(0, 0);
                // base
                sctx.globalCompositeOperation = "source-atop";
                sctx.shadowColor = "#ff8000";
                sctx.shadowOffsetX = sf(-0.6);
                sctx.shadowOffsetY = sf(-0.6 + sub.height);
                sctx.shadowBlur = sf(1);

                sub.fillText(0, -sub.height);

                // outer shadow
                sctx.globalCompositeOperation = "destination-over";
                sctx.shadowColor = "#44ad36";
                sctx.shadowOffsetX = sf(1);
                sctx.shadowOffsetY = sf(1 + sub.height);
                sctx.shadowBlur = sf(2);
                sub.fillText(0, -sub.height);
            };
        }

        // Current player turn (scale-to-fit)
        {
            const sub = new C.SubcanvasWrappedText(this, 170, 52);
            this.subCurrentPlayerTurn = sub;

            sub.setTextAnchor("center");
            // inside `renderFunc()`, apply scale-to-fit
            sub.renderFunc = subWrappedScaleToFitFunc(sub);

            sub.ctx.font = `bold 18pt ${g.FONT_STACK}`;
            sub.lineHeightPx = CtxToolkit.getLineHeight(this.subCurrentPlayerTurn.ctx, 1.1);
        }

        // Static bottom text
        {
            const sub = new C.SubcanvasText(this, 170, 22);
            this.subStaticBottom = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `12pt ${g.FONT_STACK}`;
            sub.text = "ходит";
        }
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_AFTER:
                this.subRoundNumber.update();
                this.subCurrentPlayerTurn.update();
                this.subStaticBottom.update();
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        ctx.translate(sfR(455), sfR(64));
        this.subRoundNumber.display(ctx);
        ctx.resetTransform();

        ctx.translate(sfR(455), sfR(86));
        this.subCurrentPlayerTurn.display(ctx);
        ctx.resetTransform();

        ctx.translate(sfR(455), sfR(138));
        this.subStaticBottom.display(ctx);
        ctx.resetTransform();
    }
}

/** 
 * - Used in stage `makeMove`
 * - Complex sprite
 * - Persistent
 */
export class SMakeMoveTextInfo extends Sprite {
    subPlayerName;
    subPromptText;
    subWordCount;
    subScoreCount;

    constructor() {
        super();
        this.visible = false;

        // Player name
        {
            // reference variable
            const sub = new C.SubcanvasText(this, 420, 24);
            this.subPlayerName = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `12pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "white";
        }

        // Prompt text
        {
            const sub = new C.SubcanvasText(this, 420, 30);
            this.subPromptText = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `bold 18pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = g.COLOR_PALETTE.goldenText;
        }
        
        // Word count
        {
            const sub = new C.SubcanvasText(this, 170, 16);
            this.subWordCount = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `11pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "white";
            sub.ctx.strokeStyle = g.COLOR_PALETTE.disabled;
            sub.ctx.lineWidth = 2;

            // stroke and fill the text override
            sub.renderFunc = ()=>{
                sub.strokeText(0, 0);
                sub.fillText(0, 0);
            }
        }

        // Score count
        {
            const sub = new C.SubcanvasText(this, 170, 30);
            this.subScoreCount = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `bold 18pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "black";
        }
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_AFTER:
                this.subPlayerName.update();
                this.subPromptText.update();
                this.subWordCount.update();
                this.subScoreCount.update();
                break;


            case Msg.UPDATE_MOVE_STATE_BUTTON:
                const sub = this.subPromptText;
                if (s.word_controller.stateNoSuchWord) {
                    sub.text = "Такого слова нет";
                    sub.ctx.fillStyle = "#ff8080";
                }
                else {
                    sub.text = "Введите слово:";
                    sub.ctx.fillStyle = g.COLOR_PALETTE.goldenText;
                }
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        ctx.translate(sfR(15), sfR(4));
        this.subPlayerName.display(ctx);
        ctx.resetTransform();

        ctx.translate(sfR(15), sfR(24));
        this.subPromptText.display(ctx);
        ctx.resetTransform();

        ctx.translate(sfR(455), sfR(46));
        this.subWordCount.display(ctx);
        ctx.resetTransform();

        ctx.translate(sfR(455), sfR(211));
        this.subScoreCount.display(ctx);
        ctx.resetTransform();
    }
}


/** 
 * - Used in stage `timer`
 * - Complex sprite
 * - Persistent
 */
export class STimerTextInfo extends Sprite {
    subPlayerName;
    subTimeLeftLabel;

    constructor() {
        super();
        this.visible = false;

        // Player name
        {
            // reference variable
            const sub = new C.SubcanvasText(this, 560, 30);
            this.subPlayerName = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `bold 18pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "black";
        }

        // Time left label
        {
            const sub = new C.SubcanvasText(this, 200, 20);
            this.subTimeLeftLabel = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `12pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "white";
        }
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_LOGIC:
                this.subTimeLeftLabel.text = (g.timer.isGameTimer) ? "Осталось играть:" : "Осталось ходить:";
                break;

            case Msg.TICK_AFTER:
                this.subPlayerName.update();
                this.subTimeLeftLabel.update();
                break;

            case Msg.UPDATE_TIMER_CONTROL_BUTTONS:
                this.subTimeLeftLabel.text = `Осталось ходить:`;
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        ctx.translate(sfR(40), sfR(11 + 2));
        this.subPlayerName.display(ctx);
        ctx.resetTransform();
        ctx.translate(sfR(220), sfR(48));
        this.subTimeLeftLabel.display(ctx);
        ctx.resetTransform();
    }
}


/**
 * - Used in stage `moveInfo`
 * - Complex sprite
 * - Persistent
 */
export class SMoveInfoTextInfo extends Sprite {
    subRoundNumber;
    subPlayerName;
    subStaticBottom;

    constructor() {
        super();
        this.visible = false;

        // Round number
        {
            const sub = new C.SubcanvasText(this, 170, 22);
            this.subRoundNumber = sub;

            sub.setTextAnchor("center");

            sub.ctx.font = `12pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "black";
        }

        // Current player turn (scale-to-fit)
        {
            const sub = new C.SubcanvasWrappedText(this, 170, 52);
            this.subPlayerName = sub;

            sub.setTextAnchor("center");
            // inside `renderFunc()`, apply scale-to-fit
            sub.renderFunc = subWrappedScaleToFitFunc(sub);

            sub.ctx.font = `bold 18pt ${g.FONT_STACK}`;
            sub.lineHeightPx = CtxToolkit.getLineHeight(this.subPlayerName.ctx, 1.1);
        }

        // Static bottom text
        {
            const sub = new C.SubcanvasText(this, 170, 22);
            this.subStaticBottom = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `bold 12pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = g.COLOR_PALETTE.darkBlueText;
            sub.text = "Подробности хода";
        }
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_AFTER:
                this.subRoundNumber.update();
                this.subPlayerName.update();
                this.subStaticBottom.update();
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        ctx.translate(sfR(455), sfR(64));
        this.subRoundNumber.display(ctx);
        ctx.resetTransform();

        ctx.translate(sfR(455), sfR(86));
        this.subPlayerName.display(ctx);
        ctx.resetTransform();

        ctx.translate(sfR(455), sfR(138));
        this.subStaticBottom.display(ctx);
        ctx.resetTransform();
    }
}


/**
 * - Used in stage `help`
 * - Complex sprite
 * - Persistent
 */
export class SHelpTextInfo extends Sprite {
    subHeading;
    subPageN;

    constructor() {
        super();
        this.visible = false;

        // Round number
        {
            const sub = new C.SubcanvasText(this, 480, 30);
            this.subHeading = sub;

            sub.setTextAnchor("center");

            sub.ctx.font = `bold 18pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "white";
        }

        // Static bottom text
        {
            const sub = new C.SubcanvasText(this, 240, 20);
            this.subPageN = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `12pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = g.COLOR_PALETTE.goldenText;
        }
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_AFTER:
                this.subHeading.update();
                this.subPageN.update();
                break;
            
        }
    }

    drawResult(ctx: Ctx2D): void {
        ctx.translate(sfR(80), sfR(18));
        this.subHeading.display(ctx);
        ctx.resetTransform();

        ctx.translate(sfR(200), sfR(44));
        this.subPageN.display(ctx);
        ctx.resetTransform();
    }
}


/**
 * - Used in stage `moveInfo`
 * - Complex sprite
 * - Mute clone
 */
export class SMoveInfoItems extends Sprite {
    sub;
    hasRgbTransition = false;

    constructor(
        p: {
            type: "pointsForMove",
            points: number
        }|{type: "usedAllChips"|"skip"}
    ) {
        super(540, 165);
        this.width = 160;
        this.setAnchorPoint(0.5, 0);

        if (p.type === "pointsForMove") {

            this.height = 48;

            const path = CtxToolkit.defineRoundedRect(0, 0, this.width, this.height, 11);

            this.sub = new C.AutoSubcanvas(this, this.width, this.height, (sctx)=>{
                // box
                sctx.fillStyle = g.COLOR_PALETTE.purple;
                sctx.fill(path);

                // text
                sctx.textAlign = "center";
                sctx.fillStyle = "white";
                sctx.font = `10pt ${g.FONT_STACK}`;
                sctx.fillText("Заработал(а) за ход:", this.width/2, 15);

                sctx.font = `bold 18pt ${g.FONT_STACK}`;
                sctx.fillText(`${p.points} ${F.sklonenieNoun(p.points, "очко", "очка", "очков")}`, this.width/2, 40);
            });

        }
        else if (p.type === "usedAllChips") {

            this.height = 22;

            const path = CtxToolkit.defineRoundedRect(0, 0, this.width, this.height, 11);
            
            this.hasRgbTransition = true;
            this.sub = new C.AutoSubcanvas(this, this.width, this.height, (sctx)=>{
                // box
                sctx.fillStyle = g.COLOR_PALETTE.transBlack;
                sctx.fill(path);

                // text
                sctx.textAlign = "center";

                const gradient = sctx.createLinearGradient(0, 0, this.width, 0);
                const gradientTime = (m.time*40);
                gradient.addColorStop(0, `hsl(${ (gradientTime) % 360 }, 100%, 66%)`);
                gradient.addColorStop(1, `hsl(${ (gradientTime + 60) % 360 }, 100%, 66%)`);

                sctx.fillStyle = gradient;

                sctx.font = `10pt ${g.FONT_STACK}`;
                sctx.fillText("Использовал(а) все фишки", this.width/2, 15);
            });
            
        }
        else {

            this.height = 22;

            const path = CtxToolkit.defineRoundedRect(0, 0, this.width, this.height, 11);
            
            this.sub = new C.AutoSubcanvas(this, this.width, this.height, (sctx)=>{
                // box
                sctx.fillStyle = g.COLOR_PALETTE.transBlack;
                sctx.fill(path);

                // text
                sctx.textAlign = "center";
                sctx.fillStyle = "white";

                sctx.font = `10pt ${g.FONT_STACK}`;
                sctx.fillText("Пропустил(а) ход", this.width/2, 15);
            });

        }

        this.new = false;
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_AFTER:
                if (this.hasRgbTransition) {
                    this.sub.postponedUpdate = true;
                }
                this.sub.update();
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        this.sub.display(ctx);
    }
}


export class SFinishGameTextInfo extends Sprite {
    subPlayerName;
    subStaticPromptText;

    constructor() {
        super();
        this.visible = false;

        // Player name
        {
            // reference variable
            const sub = new C.SubcanvasText(this, 420, 24);
            this.subPlayerName = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `12pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = "white";
        }

        // Prompt text
        {
            const sub = new C.SubcanvasWrappedText(this, 420, 48);
            this.subStaticPromptText = sub;

            sub.setTextAnchor("center");
            sub.ctx.font = `bold 18pt ${g.FONT_STACK}`;
            sub.ctx.fillStyle = g.COLOR_PALETTE.goldenText;
            sub.text = "Укажите фишки, за которые вычитаются очки с этого игрока:";
            sub.lineHeightPx = CtxToolkit.getLineHeight(sub.ctx);
        }
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_AFTER:
                this.subPlayerName.update();
                this.subStaticPromptText.update();
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        ctx.translate(sfR(15), sfR(4));
        this.subPlayerName.display(ctx);
        ctx.resetTransform();

        ctx.translate(sfR(15), sfR(22));
        this.subStaticPromptText.display(ctx);
        ctx.resetTransform();
    }
}


function subWrappedScaleToFitFunc(sub: C.SubcanvasWrappedText) {
    return (sctx: Ctx2D) => {
        // CALCULATE
        const textWidth = sctx.measureText(sub.text).width;
        const linesAndWidths: [string, number][] = (
            // if the text is not long enough
            (textWidth < sub.width)
            // it will consist of 1 line
            ? [[sub.text, textWidth]]
            // it will wrap almost equally to 2 lines
            : CtxToolkit.preWrapTextToTwoLines(sctx, sub.text)
        );
        const textOffsetY = (linesAndWidths.length === 1) ? -5 : 0;

        const targetScale = Math.min(
            sub.width / Math.max(...linesAndWidths.map(lineWithWidth => lineWithWidth[1])),
            1
        );

        // DRAW
        sctx.scale(targetScale, targetScale);
        sub.drawText(linesAndWidths.map(lineWithWidth => lineWithWidth[0]), 0, textOffsetY, true);
    };
}
