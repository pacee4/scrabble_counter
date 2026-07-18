import {Collection, AutoCollection, type Ctx2D, type Sprite } from "@/core/base_classes";
import { messages } from "@/core/sensing_properties";
import { settings } from "@/editable/settings";
import type { Msg } from "@/editable/msg";

import { Main } from "@/sprites/sprite_main";
import { SBackground, SBackgroundParticles, SChip, SMidground, SMidgroundText, STitle, SPlayerTurnTextInfo, SMakeMoveTextInfo, STimerTextInfo, SMoveInfoTextInfo, SMoveInfoBoard, SMoveInfoBoardNavigationButtons, SMoveInfoItems, SHelpNavigationButtons, SHelpTextInfo, SFinishGameTextInfo } from "./sprites";
import { SMultiplierButtons, SStarButton } from "./sprites_buttons";
import { KeyboardController, MakeMoveController, ContextMenuController, WordController, MoveInfoController, HelpController, FinishGameController } from "./sprites_controllers";
import { SButtonTimerEdit, SButtonTimerMore, SButtonTimerPlayControl, SButtonTimerReset, STimer } from "./sprite_timer";

// SPRITE STORAGE
type SpriteOrCollection = Sprite | Collection<Sprite>;
export class SpriteStorage {
    //#region 
    main = new Main();
    keyboard_controller = new KeyboardController();
    word_controller = new WordController();
    make_move_controller = new MakeMoveController();
    context_menu_controller = new ContextMenuController();
    move_info_controller = new MoveInfoController();
    help_controller = new HelpController();
    finish_game_controller = new FinishGameController();

    background = new SBackground();
    background_particles = new AutoCollection((x: number, y: number)=>new SBackgroundParticles(x, y));

    chips = new Collection();

    stage_replaceable = new Collection();
    keyboard_panel = new Collection();
    multiplier_buttons = new Collection<SMultiplierButtons>();
    star_button = new Collection<SStarButton>();

    title = new STitle();

    help_navigation_buttons = new Collection<SHelpNavigationButtons>(
        new SHelpNavigationButtons("left"),
        new SHelpNavigationButtons("right")
    );

    move_info_board = new SMoveInfoBoard();
    move_info_board_navigation_buttons = new Collection<SMoveInfoBoardNavigationButtons>(
        new SMoveInfoBoardNavigationButtons("left"),
        new SMoveInfoBoardNavigationButtons("right")
    );
    move_info_items = new Collection<SMoveInfoItems>();

    midground = new SMidground();
    midground_text = new SMidgroundText();
    player_turn_text_info = new SPlayerTurnTextInfo();
    make_move_text_info = new SMakeMoveTextInfo();
    timer_text_info = new STimerTextInfo();
    move_info_text_info = new SMoveInfoTextInfo();
    help_text_info = new SHelpTextInfo();
    finish_game_text_info = new SFinishGameTextInfo();
    
    timer_case = new STimer();
    button_timer_play_control = new SButtonTimerPlayControl();
    button_timer_reset = new SButtonTimerReset();
    button_timer_edit = new SButtonTimerEdit();
    button_timer_more = new SButtonTimerMore();

    context_menu = new Collection();

    //#endregion

    /**
     * Add objects to the logic and drawing order (EDITABLE).
     * 
     * The order in which sprites are added to this collection
     * is the order in which their logic is executed in the
     * `messageStep` method and they are drawn in the `draw()` method. The lower
     * a sprite is added, the closer to the screen layer it will be displayed.
     */
    sprites: SpriteOrCollection[] = [
        this.main,
        this.keyboard_controller, this.word_controller, this.make_move_controller, this.context_menu_controller, this.move_info_controller, this.help_controller, this.finish_game_controller,

        this.background, this.background_particles,

        this.midground,
        this.title, 
        this.move_info_board, this.move_info_board_navigation_buttons, this.move_info_items,
        this.help_navigation_buttons,
        this.chips, this.stage_replaceable,
        
        this.timer_case,
        this.button_timer_play_control, this.button_timer_reset, this.button_timer_edit, this.button_timer_more,

        this.keyboard_panel, this.multiplier_buttons, this.star_button,

        this.player_turn_text_info, this.make_move_text_info, this.timer_text_info, this.move_info_text_info, this.help_text_info, this.finish_game_text_info,
        this.midground_text,

        this.context_menu
    ];

    //#region
    private readonly MAX_LAYERS = settings.MAX_LAYERS ?? 1;
    constructor() {
        s = this;
    }


    

    /**@internal */
    updateSprites() {
        // messageStep
        while (messages.hasFirstLevelMessages()) {
            this._messageStepObjects(messages.obtainFirstLevelMessage());

            while (messages.hasSecondLevelMessages()) {
                this._messageStepObjects(messages.obtainSecondLevelMessage(), true);
            }
        }
    }

    private _messageStepObjects(message: Msg, ignoreIsNewProperty=false) {
        if (window.debugTools && window.debugTools.logMessages) {
            window.debugTools.calledMessages.push(message);
        }

        for (const obj of this.sprites) {
            if (obj instanceof Collection) {
                // it is a collection
                for (const sprite of obj.array) {
                    this._updateSprite(sprite, message, ignoreIsNewProperty);
                }
            }
            else {
                // it is a sprite
                this._updateSprite(obj, message, ignoreIsNewProperty);
            }
        }
    }

    private _updateSprite(sprite: Sprite, message: Msg, ignoreIsNewProperty=false) {
        if (
            (ignoreIsNewProperty || !sprite.new)
            && !sprite.delete && !(sprite.master && sprite.master.delete))
        {
            sprite.messageStep(message);
        }
    }

    
    /**@internal */
    handleDeletionOfSprites() {
        // handle deletion of sprites
        for (const collection of this.sprites) {
            if (collection instanceof Collection) {
                for (let i = collection.array.length-1; i >= 0; i-=1) {
                    const sprite = collection.array[i];
                    if (
                        sprite.delete
                        || (sprite.master && sprite.master.delete) // if the slave's master is deleted, delete the slave
                    ) {
                        collection.array.splice(i, 1); // deletes the sprite from its group
                    }
                }
            }
        }
    }

    /**@internal */
    takeNewFromSprites(){
        for (const obj of this.sprites) {
            if (obj instanceof Collection) {
                for (const sprite of obj.array) {
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

    /**@internal */
    drawSprites(ctx: Ctx2D) {
        for (let layer = 0; layer <= this.MAX_LAYERS; layer++) {
            for (let obj of this.sprites) {
                if (obj instanceof Collection) {
                    for (let sprite of obj.array) {
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