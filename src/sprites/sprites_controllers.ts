import * as F from "@/core/functions";
import * as C from "@/editable/custom";
import { CtxToolkit } from "@/editable/custom";
import { m, messages, sf, sfR } from "@/core/sensing_properties";
import { calculateMovePoints, calculateWordPoints, ChipMultiplier, g, type MoveDataWithScore } from "@/editable/global_properties";

import { ACompCollidable, Sprite, type Ctx2D } from "@/core/base_classes";
import { Msg } from "@/editable/msg";
import { settings } from "@/editable/settings";

import { s } from "./storage";
import { o } from "./html_elements";
import { gatheredAssets } from "@/core/asset_loader";
import { SCheckboxes } from "./sprites_buttons";
import { SContextMenuBoxWithHeader } from "./sprites_context_menu";
import { SMoveInfoItems } from "./sprites";
import { soundManager } from "@/core/sound_manager";


class ControllerSprite extends Sprite {
    visible = false;
    
    constructor() {
        super();
    }
}


export class KeyboardController extends ControllerSprite {
    private backspaceHoldingDuration = 0;

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.LISTEN_TO_KEYBOARD:
                for (let [k, v] of m.keys.entries()) {
                    if (v.holding === false) {
                        const lowercaseChar = v.character.toLowerCase();
                        // russian character
                        if (/^[а-я]$/.test(lowercaseChar)) {
                            s.word_controller.addChip(lowercaseChar);
                        }
                        // multiplier
                        else if (g.stage==="makeMove" && v.character === "0") {
                            s.word_controller.pickMultiplier("");
                        }
                        else if (g.stage==="makeMove" && v.character === "1") {
                            s.word_controller.pickMultiplier("letter_x2");
                        }
                        else if (g.stage==="makeMove" && v.character === "2") {
                            s.word_controller.pickMultiplier("letter_x3");
                        }
                        else if (g.stage==="makeMove" && v.character === "3") {
                            s.word_controller.pickMultiplier("word_x2");
                        }
                        else if (g.stage==="makeMove" && v.character === "4") {
                            s.word_controller.pickMultiplier("word_x3");
                        }
                        else if (g.stage==="makeMove" && v.character === "*") {
                            s.word_controller.pickStar(true);
                        }
                        // enter
                        else if (k === "Enter") {
                            messages.broadcast(Msg.SUBMIT_CLICK_BUTTON);
                        }
                        // delete
                        else if (g.stage==="makeMove" && k === "Delete") {
                            s.make_move_controller.deleteLastItem();
                        }
                    }
                }
                // backspace
                if (m.keyIsDown("Backspace")) {
                    if (this.backspaceHoldingDuration === 0) {
                        s.word_controller.eraseChip();
                    }

                    if (this.backspaceHoldingDuration !== -1) {
                        this.backspaceHoldingDuration += m.delta;
                    }

                    if (this.backspaceHoldingDuration >= 1) {
                        s.word_controller.eraseAllChips();
                        this.backspaceHoldingDuration = -1;
                    }
                }
                else {
                    this.backspaceHoldingDuration = 0;
                }

                break;
        }
    }
}


export class WordController extends ControllerSprite {
    selectedMultiplier: ChipMultiplier.Literal = "";
    selectedStar = false;
    word = "";
    multipliers = "";

    removingLetters = "";
    
    stateNoSuchWord = false;
    isFinishingGame = false;

    constructor() {
        super();
    }

    resetValues() {
        if (this.isFinishingGame) {
            this.removingLetters = "";
        }
        else {
            this.selectedMultiplier = "";
            this.selectedStar = false;
            this.word = "";
            this.multipliers = "";
        }
    }
    

    pickMultiplier(selectedMultiplier: typeof this.selectedMultiplier) {
        if (this.selectedMultiplier !== selectedMultiplier) {
            this.selectedMultiplier = selectedMultiplier;
        }
        else {
            this.selectedMultiplier = "";
        }

        s.multiplier_buttons.array.forEach((sprite)=>{
            sprite.updateState();
        });
    }
    pickStar(toggle: boolean) {
        if (toggle) {
            this.selectedStar = !this.selectedStar;
        }
        else {
            this.selectedStar = false;
        }

        if (s.star_button.array[0]) s.star_button.array[0].updateState();
    }

    /** Adds a chip with selected multiplier and star. */
    addChip(letter: string) {
        if (this.isFinishingGame) {
            if (this.removingLetters.length < 7) {
                this.removingLetters += letter;

                this.updateChips();
            }
        }
        else {
            if (this.word.length < 15) {
                this.word += letter;
                this.multipliers += String(ChipMultiplier.propsToNumber(this.selectedMultiplier, this.selectedStar));

                this.updateChips();

                this.clearPicks();
            }
        }
    }
    eraseChip() {
        if (this.isFinishingGame) {
            if (this.removingLetters.length > 0) {
                this.removingLetters = this.removingLetters.slice(0, -1);

                this.updateChips();
            }
        }
        else {
            if (this.word.length > 0) {
                this.word = this.word.slice(0, -1);
                this.multipliers = this.multipliers.slice(0, -1);

                this.updateChips();
            }
        }
    }
    eraseAllChips() {
        if (this.isFinishingGame) {
            if (this.removingLetters.length > 0) {
                this.removingLetters = "";

                this.updateChips();
            }
        }
        else {
            if (this.word.length > 0) {
                this.word = "";
                this.multipliers = "";

                this.updateChips();
            }
            this.clearPicks();
        }
        
    }

    updateChips() {
        s.chips.clear();
        const chips = (this.isFinishingGame)
            ? g.chipMaker.generateChips2(this.removingLetters, "0".repeat(this.removingLetters.length), 225, 110, 50, 1, 410)
            : g.chipMaker.generateChips2(this.word, this.multipliers, 225, 110, 50, 1, 410)
        s.chips.addMultiple(...chips);

        this.stateNoSuchWord = false;
        messages.broadcast(Msg.UPDATE_MOVE_STATE_BUTTON);
    }

    clearPicks() {
        this.pickMultiplier("");
        this.pickStar(false);
    }

    checkWord() {
        return g.wordList.has(s.word_controller.word);
    }

    warnNoSuchWord() {
        this.stateNoSuchWord = true;
        messages.broadcast(Msg.UPDATE_MOVE_STATE_BUTTON);
    }


    messageStep(message: Msg): void {
        switch (message) {
            case Msg.START_GAME:
                this.resetValues();
                break;
        }
    }
}


export class MakeMoveController extends ControllerSprite {
    newMove!: MoveDataWithScore;
    isModifyingLastMove = false;

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.START_GAME:
                this.resetValues();
                this.isModifyingLastMove = false;
                break;
            case Msg.UPDATE_MOVE_STATE_BUTTON:
                o.wordList.deselectItems();
                break;
        }
    }

    resetValues() {
        this.newMove = {
            usedAllChips: false,
            points: 0,
            words: []
        };
        this.updateWordCount();
        this.updatePoints();
    }

    /** Adds a word to the move dictionary and to the HTML word list. */
    addWordItem() {
        const word = s.word_controller.word;
        const multipliers = s.word_controller.multipliers;
        const points = calculateWordPoints(word, multipliers);

        this.newMove.words.push({word, multipliers, points});
        o.wordList.addItem(word, points);

        s.word_controller.resetValues();
        s.word_controller.updateChips();
        s.word_controller.clearPicks();

        this.updateWordCount();
        this.updatePoints();
    }

    deleteLastItem() {
        o.wordList.deleteLastItem();
    }

    eraseItems() {
        o.wordList.eraseItems();
        this.resetValues();
    }

    updateWordCount() {
        const wordCount = this.newMove.words.length;
        s.make_move_text_info.subWordCount.text = 
            (wordCount > 0)
            ? `${wordCount} ${F.sklonenieNoun(wordCount, "слово", "слова", "слов")}`
            : "";
    }

    updatePoints() {
        this.newMove.points = calculateMovePoints(this.newMove.words.map((word)=>(word.points)), this.newMove.usedAllChips);

        s.make_move_text_info.subScoreCount.text = `= ${this.newMove.points} ${F.sklonenieNoun(this.newMove.points, "очко", "очка", "очков")}`;
    }

    confirmMove() {
        if (this.newMove.points === 0) {
            this.newMove.usedAllChips = false;
        }
        o.table.makeMove(this.newMove);
        s.word_controller.eraseAllChips();
        this.eraseItems();

        this.isModifyingLastMove = false;

        // reset timer
        if (!g.timer.isGameTimer) {
            s.timer_case.setTimer();
        }

        g.timer.seconds = s.timer_case.getTimeLeft();
        g.saveStorageData();

        soundManager.produce("confirm_move");

        s.main.changeStage("table");
    }

    modifyLastMove() {
        console.log("modify last move");

        this.isModifyingLastMove = true;
        this.eraseItems();
        s.word_controller.eraseAllChips();

        // extract last move from table
        this.newMove = o.table.extractLastMove();
        console.log(this.newMove);

        this.newMove.words.forEach((word)=>{
            o.wordList.addItem(word.word, word.points);
        });

        this.updatePoints();
        this.updateWordCount();

        s.main.changeStage("makeMove");
    }
}


export class ContextMenuController extends ControllerSprite {
    isShown = false;
    private focusOutCollidable: ACompCollidable|null = null;

    createContextMenu(p: {
        x?: number,
        y?: number,
        sprites: Sprite[],
        focusOutCollidable?: ACompCollidable
    }) {
        this.focusOutCollidable = p.focusOutCollidable ?? null;
        this.isShown = true;

        for (let sprite of p.sprites) {
            sprite.goBy(p.x ?? 0, p.y ?? 0);
            s.context_menu.add(sprite);
        }

        this.anim.appear.start();
    }


    private anim = {
        appear: new C.AnimationSequence(()=>{
            s.main.isBusy = true;
        })
        .createState({
            duration: 0.3,
            onTick: (t)=>{
                s.context_menu.array.forEach((sp)=>{
                    sp.opacity = t.percent;
                });

                if (t.percent >= 1) {
                    s.main.isBusy = false;
                }
            }
        }),

        fadeAndClear: new C.AnimationSequence(()=>{
            s.main.isBusy = true;
        })
        .createState({
            duration: 0.3,
            onTick: (t)=>{
                s.context_menu.array.forEach((sp)=>{
                    sp.opacity = 1-t.percent;
                });

                if (t.percent >= 1) {
                    this.deleteContextMenu();
                }
            }
        })
    };


    /** Delete context menu immediately */
    deleteContextMenu() {
        if (this.isShown) {
            this.isShown = false;
            s.main.isBusy = false;
            s.context_menu.clear();
        }
    }


    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_CONTEXT_MENU_CLICK:
                if (
                    m.pointerIsPressed(0)
                    && (!this.focusOutCollidable || !this.focusOutCollidable.collidePointer(0))
                ) {
                    this.anim.fadeAndClear.start();
                }
                break;

            
            case Msg.TICK_LOGIC:
                Object.values(this.anim).forEach((anim)=>{anim.simulateTick();});
                break;
        }
    }
}


const BLUE_CLASS_NAME = "js-selected";
export class MoveInfoController extends ControllerSprite {
    // selected values
    private roundI = 0;
    private playerI = 0;
    cellI = -1;
    elCell: HTMLElement|null = null;

    private moveRef: MoveDataWithScore|null = null;

    wordI = 0;
    wordCount = 0;

    /** Also changes `o.table` */
    handleClick(cellI: number, elCell: HTMLElement|null) {
        if (this.cellI === cellI || cellI === -1) {
            if (this.elCell) {
                this.elCell.classList.remove(BLUE_CLASS_NAME);

                // hide
                this.cellI = -1;
                this.elCell = null;
                console.log("hide");

                this.animHideBoard();
            }
        }
        else if (this.cellI === -1) {
            // show
            this.cellI = cellI;
            this.elCell = elCell;
            console.log("show");

            this.elCell!.classList.add(BLUE_CLASS_NAME);

            this.changeBoardMove();
        }
        else {
            // change
            this.elCell!.classList.remove(BLUE_CLASS_NAME);

            this.cellI = cellI;
            this.elCell = elCell;
            console.log("change");

            this.elCell!.classList.add(BLUE_CLASS_NAME);

            this.changeBoardMove();
        }
    }


    private changeBoardMove() {
        this.playerI = Math.floor(this.cellI % g.playerList.length);
        this.roundI = Math.floor(this.cellI / g.playerList.length);

        // just opening board
        if (g.stage !== "moveInfo") {
            this.showBoard();
        }

        // round number
        s.move_info_text_info.subRoundNumber.text = `Круг № ${this.roundI+1}`;
        // player name
        s.move_info_text_info.subPlayerName.text = g.playerList[this.playerI];

        this.moveRef = g.table[this.playerI].moves[this.roundI];

        this.wordCount = this.moveRef.words.length;
        this.wordI = (this.wordCount > 0) ? 0 : -1; // "Word 0 of 0"

        // items
        {
            const s_items: SMoveInfoItems[] = [];

            if (this.wordCount > 0) {
                if (this.moveRef.usedAllChips) {
                    s_items.push(new SMoveInfoItems({type: "usedAllChips"}));
                }
                s_items.push(new SMoveInfoItems({type: "pointsForMove", points: this.moveRef.points}));
            }
            else {
                s_items.push(new SMoveInfoItems({type: "skip"}));
            }
            
        


            let itemY = 165;
            s_items.forEach((sp)=>{
                sp.y = itemY;
                itemY += sp.height + 4;
            });

            s.move_info_items.clear();
            s.move_info_items.addMultiple(...s_items);
        }

        this.anim.appearChips.start();

        this.changeBoardWord();
    }

    changeBoardWord(wordIBy = 0) {
        this.wordI += wordIBy;
        // word count
        s.move_info_board.subWordCount.text = `Слово ${this.wordI + 1} из ${this.moveRef!.words.length}`;
        
        // points for word
        const pointsForWord = (this.wordCount > 0) ? this.moveRef!.words[this.wordI].points : 0;
        s.move_info_board.subPointsForWord.text = `${pointsForWord} ${F.sklonenieNoun(pointsForWord, "очко", "очка", "очков")}`;

        messages.broadcast(Msg.UPDATE_MOVE_INFO_NAVIGATION_BUTTONS);

        // replace chips
        s.chips.clear();
        if (this.wordCount > 0) {
            const wordRef = this.moveRef!.words[this.wordI];
            const chips = g.chipMaker.generateChips2(wordRef.word, wordRef.multipliers, 220, 298, 48, 1, 394);
            s.chips.addMultiple(...chips);
        }
    }

    private showBoard() {
        s.main.changeStage("moveInfo");
        messages.broadcast(Msg.UPDATE_TABLE_APPEARANCE);

        this.anim.appear.start();
        this.anim.appearChips.start();
    }

    private animHideBoard() {
        this.anim.fade.start();
    }

    
    hideBoard() {
        // check for cell highlight once or again
        if (this.elCell) {
            this.elCell.classList.remove(BLUE_CLASS_NAME);
            // hide
            this.cellI = -1;
            this.elCell = null;
        }
        this.moveRef = null;

        s.move_info_board.visible = false;
        s.move_info_board_navigation_buttons.array.forEach((sp)=>{sp.visible = false;});

        s.chips.clear();

        s.main.changeStage("table");
        messages.broadcast(Msg.UPDATE_TABLE_APPEARANCE);
    }


    private anim = {
        appear: new C.AnimationSequence(()=>{
            s.move_info_board.visible = true;
            s.main.isBusy = true;

            s.move_info_board_navigation_buttons.array.forEach((sp)=>{sp.visible = true;});
        })
        .createState({
            duration: 0.3,
            onTick: (t)=>{
                s.move_info_board.opacity = t.percent;
                s.move_info_board_navigation_buttons.array.forEach((sp)=>{
                    sp.opacity = t.percent;
                });

                if (t.percent >= 1) {
                    s.main.isBusy = false;
                }
            }
        }),

        appearChips: new C.AnimationSequence()
        .createState({
            duration: 0.3,
            onTick: (t)=>{
                s.chips.array.forEach((sp)=>{
                    sp.opacity = t.percent;
                });
            }
        }),

        fade: new C.AnimationSequence(()=>{
            s.main.isBusy = true;
        })
        .createState({
            duration: 0.3,
            onTick: (t)=>{
                s.move_info_board.opacity = 1-t.percent;
                [s.move_info_board_navigation_buttons, s.chips].forEach((co)=>{
                    co.array.forEach((sp)=>{
                        sp.opacity = 1-t.percent;
                    });
                });

                if (t.percent >= 1) {
                    s.main.isBusy = false;

                    s.move_info_controller.hideBoard();
                }
            }
        })
    };

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_LOGIC:
                Object.values(this.anim).forEach((anim)=>{anim.simulateTick();});
                break;
        }
    }
}


export class HelpController extends ControllerSprite {
    readonly HEADERS = [
        "Что такое Эрудит?",
        "Кто ходит первым?",
        "Ход игры",
        "Куда выкладывать фишки?",
        "Правила и советы",
        "Бонусы",
        "Сколько будет длиться игра?"
    ]

    pageN = 0;
    readonly pageCount = this.HEADERS.length;

    resetValues() {
        this.pageN = 0;
        this.showCurrentPage();
    }
    
    turnPageBy(by = 0) {
        this.pageN += by;
        this.showCurrentPage();
    }

    private showCurrentPage() {
        // change the heading text
        s.help_text_info.subHeading.text = this.HEADERS[this.pageN];
        s.help_text_info.subPageN.text = `Страница ${this.pageN+1} из ${this.pageCount}`;

        o.help.showCurrentPage();
        messages.broadcast(Msg.UPDATE_HELP_NAVIGATION_BUTTONS);
    }
}


export class FinishGameController extends ControllerSprite {
    // TO-DO: connect tightly to o.playerScores. remove unnecessary properties

    playerI = 0;
    finalScore: number[] = [];

    reset() {
        this.finalScore = g.table.map((playerData)=>(playerData.score));

        s.word_controller.isFinishingGame = true;
        s.word_controller.eraseAllChips();
        
        this.playerI = 0;
        this.update();
    }
    nextPlayer() {
        this.removePoints();

        o.playerScores.nextItem();

        this.playerI += 1;
        s.word_controller.eraseAllChips();
        this.update();
    }

    private removePoints() {
        const finalScore = Math.max(this.finalScore[this.playerI] - calculateWordPoints(s.word_controller.removingLetters, ""), 0);
        this.finalScore[this.playerI] = finalScore;
        
        o.playerScores.doneItem(finalScore);
    }

    private update() {
        s.finish_game_text_info.subPlayerName.text = g.playerList[this.playerI];

        messages.broadcast(Msg.UPDATE_FINISH_STATE);
    }

    finishGame() {
        this.removePoints();

        messages.broadcast(Msg.END_GAME);
        console.log("Finish the game");

        o.playerScores.sortLeaderboard();

        s.main.changeStage("gameFinished");
    }
}