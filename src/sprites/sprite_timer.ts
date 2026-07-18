import * as F from "@/core/functions";
import * as C from "@/editable/custom";
import { CtxToolkit } from "@/editable/custom";
import { m, messages, sf, sfR } from "@/core/sensing_properties";
import { g, type MoveDataWithScore } from "@/editable/global_properties";

import { ACompCollidable, CompHitbox, Sprite, type Ctx2D } from "@/core/base_classes";
import { Msg } from "@/editable/msg";
import { settings } from "@/editable/settings";

import { s } from "./storage";
import { SAButton, SRoundedIconButtons } from "./sprites_buttons";
import { gatheredAssets } from "@/core/asset_loader";

import { o } from "./html_elements";
import { soundManager } from "@/core/sound_manager";

/**
 * - Persistent
 * - Complex sprite
 * - Disabled first
 * - Connected with HTML stage constituent `o.timerInput`
 */
export class STimer extends SAButton {
    readonly WIDTH = 424;
    readonly HEIGHT = 164;

    clickHitbox: ACompCollidable;
    click;

    disabled = true;

    private subTimeLeft;
    private showTime = true;

    private resizeSubTimeLeft() {
        this.subTimeLeft.resizeToScale(this.WIDTH * this.scale.x, this.HEIGHT * this.scale.y);
    }

    private stateH: "topRight"|"inInput"|"full"|"none" = "none";

    constructor() {
        super(0, 0);
        this.visible = false;
        this.scaleTo(0.25);

        this.setImageKey("timer_case-move"); // the texture key is need first for correct alignment
        this.setAnchorPoint(0.5, 0.5);

        this.subTimeLeft = new C.Subcanvas(this.WIDTH, this.HEIGHT, (sctx, seconds: number)=>{
            sctx.scale(this.scale.x*4, this.scale.y*4);

            sctx.font = `24pt ${g.FONT_STACK}`;
            sctx.textAlign = "center";
            sctx.textBaseline = "middle";
            sctx.fillStyle = (
                (!this.timeIsTicking) ? "#808080"
                : (this.intSecondsLeft <= 30 || (g.timer.isGameTimer && this.intSecondsLeft <= 180)) ? g.COLOR_PALETTE.redText
                : g.COLOR_PALETTE.greenText
            );
            sctx.fillText(
                (g.timer.seconds > 0) ? convertSecondsToStringTime(seconds) : "--:--",
                (this.WIDTH/4/2), (this.HEIGHT/4/2 + 2)
            );
        });
        
        this.clickHitbox = new CompHitbox(this, {x: -58*4, y: -25*4, width: 116*4, height: 51*4}, true);
        this.click = new C.CompClickable(this, this.clickHitbox, this.clickAction);
    }

    // VISIBILITY
    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.START_GAME:
                this.setTimer();
                break;

            case Msg.TICK_CLICK:
                // in stage timer, if clicked outside of the timer case or edit button, disable editing
                if (
                    (g.stage === "timer")
                    && this.isEditing()
                    && m.pointerIsPressed(0)
                    && !(this.clickHitbox.collidePointer(0) || s.button_timer_edit.clickHitbox.collidePointer(0))
                ) {
                    this.setTimer();
                }
                break;


            case Msg.TICK_LOGIC:
                this.tickTimer();
                break;


            case Msg.TICK_AFTER:
                if (m.isResized) {
                    this.resizeSubTimeLeft();
                }

                this.setImageKeyTick("timer_case" + (g.timer.isGameTimer?"-game":"-move") + (this.click.focused?"-p":""));
                this.subTimeLeft.render(this.intSecondsLeft);
                
                break;
        }
    }
    /** Also toggles message ability of this sprite */
    public changePlacementState(state: typeof this.stateH) {
        if (this.stateH === state) return;
        this.stateH = state;

        this.visible = true;
        
        if (state === "topRight") {
            this.disabled = false;

            this.goTo(540, 31-1.5);
            this.scaleTo(0.25);
        }
        else if (state === "inInput") {
            this.disabled = true;

            this.goTo(450, 122-1.5);
            this.scaleTo(0.25);
        }
        else if (state === "full") {
            this.disabled = true;

            this.goTo(320, 180);
            this.scaleTo(1);
        }
        else {
            this.visible = false;
        }

        if (this.visible) {
            this.resizeSubTimeLeft();
        }
    }
    drawResult(ctx: Ctx2D): void {
        this.drawSelf(ctx);

        if (this.showTime) {
            ctx.translate(sfR(20), sfR(32));
            ctx.scale(1/this.scale.x, 1/this.scale.y);
            
            this.subTimeLeft.display(ctx);
        }
    }

    clickAction = ()=>{
        messages.broadcast(Msg.EXPAND_TIMER);
    }

    // TICK TIMER
    private tickTimer() {
        if (this.timeIsTicking) {
            // tick timer
            this.floatSecondsLeft -= m.delta;

            const intSecondsLeft = Math.ceil(this.floatSecondsLeft);
            
            if (this.intSecondsLeft !== intSecondsLeft) {
                this.intSecondsLeft = intSecondsLeft;
                
                if (intSecondsLeft <= 0) {
                    soundManager.produce("bell");
                    this.stopTimer();
                }
                
                else if (g.timer.tickSound) {
                    soundManager.produce("tick");
                }
            }
        }
    }

    // CONTROL

    public getTimeLeft() {
        return this.intSecondsLeft;
    }

    /** Also leave editing */
    public setTimer(dontPlay=false) {
        if (this.isEditing()) {
            o.timerInput.exportTimeInputs();
        }
        // disable editing
        o.timerInput.hide();
        this.showTime = true;

        this.floatSecondsLeft = g.timer.seconds;
        this. intSecondsLeft = Math.ceil(this.floatSecondsLeft);

        if (g.timer.startImmediately && !this.timeIsAtZero() && !dontPlay) {
            this.startTimer();
        }
        else {
            this.timeIsSet = true;
            this.timeIsTicking = false;
        }

        messages.broadcast(Msg.UPDATE_TIMER_CONTROL_BUTTONS);
    }
    public startTimer() {
        this.timeIsTicking = true;
        this.timeIsSet = false;
        messages.broadcast(Msg.UPDATE_TIMER_CONTROL_BUTTONS);
    }
    public stopTimer() {
        this.timeIsTicking = false;
        messages.broadcast(Msg.UPDATE_TIMER_CONTROL_BUTTONS);
    }
    public timeIsAtZero() {
        return (s.timer_case.intSecondsLeft <= 0);
    }

    public editTimer() {
        this.timeIsTicking = false;
        // hide string and show inputs
        this.showTime = false;
        this.timeIsSet = true;
        o.timerInput.show();

        o.timerInput.mainEl.classList.toggle("js-isBig", (g.stage === "timer"));
        o.timerInput.importTimeInputs();
        
        messages.broadcast(Msg.UPDATE_TIMER_CONTROL_BUTTONS);
    }
    public isEditing() {
        return !this.showTime;
    }

    public timeIsSet = false;
    public timeIsTicking = false;

    private floatSecondsLeft = 0;
    private intSecondsLeft = 0;
}

/**
 * - Persistent
 */
export class SButtonTimerPlayControl extends SRoundedIconButtons {
    constructor() {
        super({
            x: 297-20,
            y: 311,
            width: 58,
            height: 38,
            radius: 6,
            backgroundColor: g.COLOR_PALETTE.lightGray,
            iconKey: "icon-play",
            clickAction: ()=>{
                if (!s.timer_case.timeIsTicking) {
                    s.timer_case.startTimer();
                }
                else {
                    s.timer_case.stopTimer();
                }
            }
        });

        this.visible = false;
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.UPDATE_TIMER_CONTROL_BUTTONS:
                this.disabled = (s.timer_case.timeIsAtZero());

                this.iconImg = gatheredAssets.subcanvasImages[(s.timer_case.timeIsTicking) ? "icon-pause" : "icon-play"];
                break;
        }
    }
}

/**
 * - Persistent
 * - Disabled first
 */
export class SButtonTimerReset extends SRoundedIconButtons {
    constructor() {
        super({
            x: 363-15,
            y: 311,
            width: 58,
            height: 38,
            radius: 6,
            backgroundColor: g.COLOR_PALETTE.lightGray,
            iconKey: "icon-reset",
            clickAction: ()=>{
                s.timer_case.setTimer(!s.timer_case.timeIsTicking);
            }
        });

        this.visible = false;
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.UPDATE_TIMER_CONTROL_BUTTONS:
                this.disabled = (s.timer_case.timeIsSet);
                break;
        }
    }
}

/**
 * - Persistent
 * - Disabled first
 */
export class SButtonTimerEdit extends SRoundedIconButtons {
    constructor() {
        super({
            x: 429-10,
            y: 311,
            width: 58,
            height: 38,
            radius: 6,
            backgroundColor: g.COLOR_PALETTE.lightGray,
            iconKey: "icon-pencil",
            clickAction: ()=>{
                if (!s.timer_case.isEditing()) {
                    s.timer_case.editTimer();
                }
                else {
                    s.timer_case.setTimer();
                }
            }
        });

        this.visible = false;
    }
}

/**
 * - Persistent
 * - Disabled first
 */
export class SButtonTimerMore extends SRoundedIconButtons {
    constructor() {
        super({
            x: 495-5,
            y: 311,
            width: 58,
            height: 38,
            radius: 6,
            backgroundColor: g.COLOR_PALETTE.lightGray,
            iconKey: "icon-three_dots",
            clickAction: ()=>{
                const sprites = s.main.createTimerPropertySprites(0, 0, "inPopupMenu");

                s.context_menu_controller.createContextMenu({
                    focusOutCollidable: new CompHitbox(sprites[0]),
                    sprites: sprites,
                    x: 320,
                    y: 198
                });
            }
        });

        this.visible = false;
    }
}


function convertSecondsToStringTime(seconds: number) {
    const {mins, secs} = F.toMinsAndSecs(seconds);
    return (
        String(mins).padStart(2, "0") + ":" +
        String(secs).padStart(2, "0")
    );
}