import * as F from "@/core/functions";
import * as C from "@/editable/custom";
import { m, messages, sf, sfR } from "@/core/sensing_properties";
import { g, type GameStages } from "@/editable/global_properties";

import { ACompCollidable, CompHitbox, CompMask, Sprite, type Ctx2D } from "@/core/base_classes";
import { Msg } from "@/editable/msg";
import { settings } from "@/editable/settings";

import { s } from "./storage";
// Import sprites

import { gatheredAssets } from "@/core/asset_loader";

import { o } from "./html_elements";
import { SRoundedLabelButtons, SCheckboxes, SKeys, SBackspaceButton, SMultiplierButtons, SStarButton, SRoundedButtonMakeMove, SRoundedIconButtons, SRoundedButtonLoadTable, SRoundedButtonFinishGame } from "./sprites_buttons";
import { createMenuItemSprites } from "./sprites_context_menu";


export class Main extends Sprite {
    private promiseComplete = false;
    private promiseCallback: (()=>void)|null = null;

    private s_buttonTimerSprites!: Sprite[];

    changeStage(to: GameStages) {
        if (g.stage !== to) {
            console.log(`changeStage(): ${g.stage} -> ${to}`);

            this.handleBeforeChangeStage(g.stage);
            this.handleAfterChangeStage(to);
            g.stage = to;
        }
        else if (import.meta.env.DEV) {
            console.log(`changeStage(): ${g.stage}`);
        }
    }
    private handleBeforeChangeStage(from: GameStages) {
        s.stage_replaceable.clear();
        s.context_menu_controller.deleteContextMenu();
        this.promiseCallback = null;
        
        switch (from) {
            case "mainMenu":
                s.chips.clear();
                break;

            case "choosePlayers":
                o.inputFields.hide();
                o.inputFields.destroyInner();

                // timer
                o.timerTerm.hide();
                o.timerInput.hide();
                s.timer_case.visible = false;
                break;

            case "table":
                o.table.hide();
                s.player_turn_text_info.visible = false;
                break;

            case "moveInfo":
                o.table.hide();
                s.move_info_text_info.visible = false;

                s.move_info_items.clear();
                break;

            case "makeMove":
                s.chips.clear();
                o.wordList.hide();
                s.make_move_text_info.visible = false;

                s.keyboard_panel.clear();
                s.multiplier_buttons.clear();
                s.star_button.clear();

                s.word_controller.clearPicks();
                break;

            case "timer":
                this.s_buttonTimerSprites.forEach((sp)=>{sp.visible = false;});

                s.timer_text_info.visible = false;
                break;


            case "help":
                o.help.destroyInner();
                o.help.hide();

                s.help_navigation_buttons.array.forEach((sp)=>{sp.visible = false;});
                s.help_text_info.visible = false;
                break;

            case "finishGame":
                s.chips.clear();
                s.keyboard_panel.clear();

                s.word_controller.isFinishingGame = false;
                
                o.playerScores.hide();
                s.finish_game_text_info.visible = false;

                break;

            case "gameFinished":
                o.playerScores.hide();

                break;
        }

        s.title.visible = false;
    }
    private handleAfterChangeStage(to: GameStages) {
        s.midground.changeMidgroundStage(to);

        switch (to) {
            case "mainMenu": {
                this.promiseCallback = ()=>{
                    s.chips.addMultiple(
                        ...g.chipMaker.generateChips("эрудит", "", 262.212, 69.815, 39.759, 1.205)
                    );
                };

                s.title.setImageKey("title");
                s.title.setAnchorPoint(0.5, 0);
                s.title.y = 10;
                s.title.visible = true;

                // buttons
                const firstButtonXPosition = (g.tableIsEmpty() ? 320 : 320-100);
                s.stage_replaceable.add(new SRoundedLabelButtons({
                    x: firstButtonXPosition, y: 320, sizePreset: "1", text: "Вперёд", backgroundColor: g.COLOR_PALETTE.lightGreen,
                    clickAction: ()=>{
                        this.changeStage("choosePlayers");
                    }})
                );
                // button: load table
                if (!g.tableIsEmpty()) {
                    s.stage_replaceable.add(new SRoundedButtonLoadTable());
                }

                // button: How to play
                s.stage_replaceable.add(new SRoundedLabelButtons({
                    x: 520, y: 212, sizePreset: "2", text: "Как играть", backgroundColor: g.COLOR_PALETTE.lightPurple,
                    clickAction: ()=>{
                        messages.broadcast(Msg.STAGE_HELP);
                    }
                }));

                // record table settings
                g.loadStorageData("tableSettings");

                break;
            }


            case "choosePlayers": {
                // buttons
                const firstButtonXPosition = (g.tableIsEmpty() ? 320 : 320-100);
                s.stage_replaceable.add(new SRoundedLabelButtons({
                    x: firstButtonXPosition, y: 320, sizePreset: "1", text: "Начать", backgroundColor: g.COLOR_PALETTE.lightGreen,
                    clickAction: ()=>{
                        // new game
                        g.clearTable();
                        messages.broadcast(Msg.START_GAME);
                    }
                }));
                // button: load table
                if (!g.tableIsEmpty()) {
                    s.stage_replaceable.add(new SRoundedButtonLoadTable());
                }

                // HTML player input list
                o.inputFields.createInner();
                o.inputFields.show();

                // timer
                o.timerTerm.show();
                o.timerInput.show();

                // timer checkboxes
                s.stage_replaceable.addMultiple(
                    ...this.createTimerPropertySprites(333, 171, "inChoosePlayers")
                );

                break;
            }
        

            case "table": {
                // table and player info
                o.table.show();
                o.table.tryShrinkToFitTexts();
                s.player_turn_text_info.visible = true;

                // buttons
                s.stage_replaceable.add(new SRoundedLabelButtons({
                    x: 540, y: 275, sizePreset: "3", text: "Сделать ход", backgroundColor: g.COLOR_PALETTE.lightGolden,
                    clickAction: ()=>{
                        this.changeStage("makeMove");
                    }
                }));
                s.stage_replaceable.add(new SRoundedLabelButtons({
                    x: 540, y: 315, sizePreset: "3", text: "Завершить игру", backgroundColor: g.COLOR_PALETTE.lightOrange, 
                    clickAction: ()=>{
                        this.changeStage("finishGame");
                    }
                }));


                // button "more"
                s.stage_replaceable.add(new SRoundedIconButtons({
                    x: 600,
                    y: 232,
                    width: 32,
                    height: 32,
                    radius: 6,
                    backgroundColor: g.COLOR_PALETTE.lightGray,
                    iconKey: "icon-three_dots",
                    clickAction: ()=>{
                        const sprites = createMenuItemSprites({
                            header: "Настройки табло",
                            content: [
                                {
                                    type: "checkbox",
                                    label: "Граница табло",

                                    objectReference: g.settings,
                                    property: "outlineOfTheTable",
                                    checkAction: ()=>{
                                        messages.broadcast(Msg.UPDATE_TABLE_APPEARANCE);
                                    }
                                },

                                {
                                    type: "button",
                                    label: "Изменить последний ход",
                                    clickAction: ()=>{
                                        s.make_move_controller.modifyLastMove();
                                    },
                                    disabled: s.make_move_controller.isModifyingLastMove || g.table[0].moves.length <= 0
                                },
                                {
                                    type: "button",
                                    label: "Посмотреть таймер",
                                    clickAction: ()=>{
                                        messages.broadcast(Msg.EXPAND_TIMER);
                                    }
                                },
                                {
                                    type: "button",
                                    label: "Главное меню",
                                    clickAction: ()=>{
                                        messages.broadcast(Msg.END_GAME);
                                        this.changeStage("mainMenu");
                                    }
                                },
                                {
                                    type: "button",
                                    label: "Как играть",
                                    backgroundColor: g.COLOR_PALETTE.lightPurple,
                                    clickAction: ()=>{
                                        messages.broadcast(Msg.STAGE_HELP);
                                    }
                                }
                            ]
                        });

                        s.context_menu_controller.createContextMenu({
                            focusOutCollidable: new CompHitbox(sprites[0]),
                            sprites: sprites,
                            x: 625,
                            y: 216
                        });
                    }
                }));

                break;
            }
            
            case "moveInfo": {
                // table, move info and board
                o.table.show();
                o.table.tryShrinkToFitTexts();
                s.move_info_text_info.visible = true;

                s.stage_replaceable.add(new SRoundedLabelButtons({
                    x: 540, y: 315, sizePreset: "3", text: "ОК", backgroundColor: g.COLOR_PALETTE.lightGreen, 
                    clickAction: ()=>{
                        s.move_info_controller.handleClick(-1, null);
                    }
                }));


                break;
            }


            case "makeMove": {
                o.wordList.show();
                s.make_move_text_info.visible = true;


                // buttons
                s.stage_replaceable.add(new SRoundedLabelButtons({
                    x: 540, y: 275, sizePreset: "3", text: "Просмотреть табло", backgroundColor: g.COLOR_PALETTE.lightGreen,
                    clickAction: ()=>{
                        this.changeStage("table");
                    }
                }));
                s.stage_replaceable.add(new SRoundedButtonMakeMove());

                // keyboard
                SKeys.createKeyboard();
                // backspace
                s.keyboard_panel.add(new SBackspaceButton());


                // multiplier buttons
                s.multiplier_buttons.addMultiple(
                    new SMultiplierButtons(152.5, 187.5, "letter_x2"),
                    new SMultiplierButtons(199.5, 187.5, "letter_x3"),
                    new SMultiplierButtons(247.5, 187.5, "word_x2"),
                    new SMultiplierButtons(297.5, 187.5, "word_x3")
                );
                // star button
                s.star_button.add(new SStarButton());

                // bonus checkbox
                const checkbox = new SCheckboxes(475, 190, "checkbox", ()=>{
                    checkbox.checked = !checkbox.checked;
                    s.make_move_controller.newMove.usedAllChips = checkbox.checked;
                    s.make_move_controller.updatePoints();
                });
                checkbox.checked = s.make_move_controller.newMove.usedAllChips; // recover checked state
                s.stage_replaceable.add(checkbox);

                // return chips for making word
                s.word_controller.updateChips();

                break;
            }


            case "timer": {
                this.s_buttonTimerSprites.forEach((sp)=>{sp.visible = true;});
                messages.broadcast(Msg.UPDATE_TIMER_CONTROL_BUTTONS);

                s.stage_replaceable.add(new SRoundedIconButtons({
                    x: 157,
                    y: 311,
                    width: 80,
                    height: 38,
                    radius: -1,
                    backgroundColor: g.COLOR_PALETTE.lightGreen,
                    iconKey: "icon-back",
                    clickAction: ()=>{
                        messages.broadcast(Msg.STAGE_RESERVED);
                    }
                }));

                s.timer_text_info.visible = true;

                break;
            }


            case "help": {
                // HTML help doc
                o.help.createInner();
                
                // buttons
                s.stage_replaceable.add(new SRoundedIconButtons({
                    x: 67,
                    y: 38,
                    width: 80,
                    height: 38,
                    radius: -1,
                    backgroundColor: g.COLOR_PALETTE.lightGreen,
                    iconKey: "icon-back",
                    clickAction: ()=>{
                        messages.broadcast(Msg.STAGE_RESERVED);
                    }
                }));

                s.help_navigation_buttons.array.forEach((sp)=>{sp.visible = true;});

                s.help_controller.resetValues();

                s.help_text_info.visible = true;

                o.help.show();

                break;
            }


            case "finishGame": {
                // buttons
                s.stage_replaceable.add(new SRoundedLabelButtons({
                    x: 540, y: 275, sizePreset: "3", text: "Просмотреть табло", backgroundColor: g.COLOR_PALETTE.lightGreen,
                    clickAction: ()=>{
                        this.changeStage("table");
                    }
                }));
                s.stage_replaceable.add(new SRoundedButtonFinishGame());

                // keyboard
                SKeys.createKeyboard();
                // backspace
                s.keyboard_panel.add(new SBackspaceButton());

                s.finish_game_controller.reset();

                o.playerScores.destroyInner();
                o.playerScores.createInner();
                o.playerScores.show();
                o.playerScores.shrinkToFitTexts();

                o.playerScores.mainEl.classList.remove("leaderboard");

                s.finish_game_text_info.visible = true;

                break;
            }


            case "gameFinished": {
                o.playerScores.show();
                o.playerScores.mainEl.classList.add("leaderboard");

                s.stage_replaceable.add(new SRoundedLabelButtons({
                    x: 320, y: 320, sizePreset: "1", text: "Главное меню", backgroundColor: g.COLOR_PALETTE.lightGreen,
                    clickAction: ()=>{
                        this.changeStage("mainMenu");
                    }})
                );

                s.title.setImageKey("game_over_title");
                s.title.setAnchorPoint(0.5, 0);
                s.title.y = 25;
                s.title.visible = true;

                break;
            }
        }

        // Timer placement
        if (to === "table" || to === "makeMove" || to === "moveInfo") {
            s.timer_case.changePlacementState("topRight");
        }
        else if (to === "timer") {
            s.timer_case.changePlacementState("full");
        }
        else if (to === "choosePlayers") {
            s.timer_case.changePlacementState("inInput");
            s.timer_case.editTimer();
        }
        else {
            s.timer_case.changePlacementState("none");
            s.timer_case.stopTimer();
        }

        // Background change
        s.background.setImageKeyTick((to === "help") ? "background-help" : "background");

        // Promise
        if (this.promiseCallback && this.promiseComplete) {
            this.promiseCallback();
            this.promiseCallback = null;
        }
    }


    private spawnParticleTimeLeft = 0;

    isBusy = false;

    constructor() {
        super();
    }
    
    messageStep(message: Msg): void {
        switch (message) {
            case Msg.START:
                g.chipMaker.init();
                g.chipMaker.chipsToImages().then(()=>{
                    this.promiseComplete = true;

                    if (this.promiseCallback) {
                        this.promiseCallback();
                        this.promiseCallback = null;
                    }
                });

                this.s_buttonTimerSprites = [s.button_timer_play_control, s.button_timer_reset, s.button_timer_edit, s.button_timer_more];

                // load word dictionary
                {
                    const wordsString = gatheredAssets.files["wordList"];
                    g.wordList = new Set<string>(
                        wordsString.split(/[\r\n]+/).map((w)=>(w.trim())).filter((w)=>(w))
                    );
                    delete gatheredAssets.files["wordList"]; // free the raw string
                }

                g.loadStorageData("tableData");

                // set HTML events
                for (const htmlElementClass of Object.values(o)) {
                    htmlElementClass.setEvents();
                }

                // DEBUG
                if (import.meta.env.DEV && true) {
                    this.changeStage("mainMenu");
                    messages.broadcast(Msg.START_GAME);
                }
                else {
                    this.changeStage("mainMenu");
                }
                break;


            case Msg.TICK:
                if (!this.promiseComplete) console.log("promise pending");

                // spawn particle
                this.spawnParticleTimeLeft -= m.delta;
                if (this.spawnParticleTimeLeft <= 0) {
                    this.spawnParticleTimeLeft += 0.2;
                    
                    s.background_particles.instantiate(
                        F.randomNumber(0, settings.SCREEN_WIDTH-1),
                        F.randomNumber(0, settings.SCREEN_HEIGHT-1)
                    );
                }

                if (!this.isBusy) {
                    if (s.context_menu_controller.isShown) {
                        messages.broadcastQueued(Msg.TICK_CONTEXT_MENU_CLICK);
                    }
                    else {
                        messages.broadcastQueued(Msg.TICK_CLICK);
                    }
                }

                if (g.stage === "makeMove" || g.stage === "finishGame") messages.broadcastQueued(Msg.LISTEN_TO_KEYBOARD);
                messages.broadcastQueued(Msg.TICK_LOGIC);
                break;

            case Msg.START_GAME:
                messages.broadcast(Msg.UPDATE_TABLE_APPEARANCE);

                o.inputFields.exportPlayerList();
                o.table.setData();
                // set timer: see STimer: messageStep(): Msg.START_GAME
                
                this.changeStage("table");
                break;


            case Msg.EXPAND_TIMER:
                if (g.stage === "moveInfo") {
                    s.move_info_controller.hideBoard();
                }
                g.reservedStage = g.stage;
                this.changeStage("timer");
                break;

                
            case Msg.STAGE_RESERVED:
                this.changeStage(g.reservedStage!);
                break;
        

            case Msg.STAGE_HELP:
                g.reservedStage = g.stage;
                this.changeStage("help");
                break;


            case Msg.UPDATE_TABLE_APPEARANCE:
                o.table.updateTableAppearance();
                break;


            case Msg.END_GAME:
                s.word_controller.eraseAllChips();
                s.make_move_controller.eraseItems();
                break;
        }
    }

    draw() {};


    private STimerCheckboxLabels = class extends Sprite {
        sub;

        constructor(x: number, y: number) {
            super(x, y);

            // width and height of the corresponding box-1
            this.sub = new C.AutoSubcanvas(this, gatheredAssets.subcanvasImages["box-1"].width, gatheredAssets.subcanvasImages["box-1"].height, 
            (sctx)=>{
                // checkbox labels
                sctx.font = `12pt ${g.FONT_STACK}`;
                sctx.textAlign = "start";
                sctx.fillStyle = "white";

                [
                    "Таймер до окончания игры",
                    "Запустить сразу",
                    "Звук тиканья"
                ]
                    .forEach((label, i)=>{
                        sctx.fillText(label, 0+39, 0+24 + i*30);
                    });

            });
        }

        messageStep(message: Msg): void {
            switch (message) {
                case Msg.TICK_AFTER:
                    this.sub.update();
                    break;
            }
        }

        drawResult(ctx: Ctx2D): void {
            this.sub.display(ctx);
        }
    }

    createTimerPropertySprites(x: number, y: number, mode:"inChoosePlayers"|"inPopupMenu") {
        const sprites: Sprite[] = [];

        sprites.push(new Sprite(x, y, "box-1"));
        sprites.push(new this.STimerCheckboxLabels(x, y));

        (["isGameTimer", "startImmediately", "tickSound"] as const) // timer properties
            .forEach((prop, i)=>{
                const checkbox = new SCheckboxes(x + 21, y + 19, "checkbox", ()=>{
                    checkbox.checked = !checkbox.checked;
                    g.timer[prop] = checkbox.checked;
                });
                checkbox.checked = g.timer[prop];
                checkbox.y = y + 19 + i*30;

                if (mode==="inPopupMenu") {
                    checkbox.clickMsg = Msg.TICK_CONTEXT_MENU_CLICK;
                }
                sprites.push(checkbox);
            });
        return sprites;
    }
}
