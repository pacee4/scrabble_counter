import { createEl, hideEl, showEl } from "@/dom";
import { g, type MoveDataWithScore, type PlayerMoves } from "@/editable/global_properties";

import * as F from "@/core/functions";
import * as C from "@/editable/custom";
import { s } from "./storage";

import { m, messages } from "@/core/sensing_properties";
import { Msg } from "@/editable/msg";


interface PlayerInputInstance {
    name: string,
    reservedName: string
}


abstract class AStageConstituent {
    protected abstract mainEl: HTMLElement;
    
    abstract setEvents(): void;
    show() {
        showEl(this.mainEl);
    }
    hide() {
        hideEl(this.mainEl);
    }
}

/** In stage `choosePlayers`: HTML Input fields */
class InputFields extends AStageConstituent {
    mainEl = document.getElementById("playersPos")!;

    private els = {
        playerList: document.querySelector("#playersPos .player-list") as HTMLElement,
        inputList: document.querySelector("#playersPos .player-input-list") as HTMLElement,
        addButton: document.querySelector("#playersPos .add-button") as HTMLElement,
    };
    
    private templatePlayerInput = document.getElementById("templatePlayerInput") as HTMLTemplateElement;

    private elFocusedInput: {
        el: HTMLInputElement,
        index: number
    }|null = null;

    private playerList: PlayerInputInstance[] = [];

    private createObjPlayer(name: string): PlayerInputInstance {
        return {name: name, reservedName: name};
    }
    private getNewName() {
        let inputValue: string;
        for (let i = 1; i <= 5; i++) {
            inputValue = `Игрок ${i}`;
            // if the name is not occupied, break the loop
            if (! this.playerList.some((val)=>(val.name === inputValue))) break;
        }
        return inputValue!;
    }

    private updatePlayerList(resultLength: number) {
        // reassign the data indexes
        [...this.els.inputList.children].forEach((el, i)=>{
            const stringI = String(i);
            if ((<HTMLElement>el).dataset.index !== stringI) {
                (<HTMLElement>el).dataset.index = stringI;
            }

            (<HTMLButtonElement>el.getElementsByClassName("bUp")[0])
                .disabled = (i === 0);
            (<HTMLButtonElement>el.getElementsByClassName("bDown")[0])
                .disabled = (i >= this.playerList.length-1);
        });
        

        this.els.addButton.classList.toggle("hide", (resultLength >= 4));

        [...this.els.inputList.getElementsByClassName("bRemove")].forEach((el)=>{
            el.classList.toggle("hide", (resultLength <= 2));
        });

        messages.broadcast(Msg.UPDATE_LOAD_TABLE_BUTTON);
    }
    private findInstanceIndex(el: Element) {
        return Number((<HTMLElement>el.closest(".instance")).dataset.index);
    }
    private checkDuplicates(index: number, value: string) {
        return this.playerList.some((val, i)=>(index !== i && val.name === value));
    }
    private updateInputs() {
        let isInvalidInput = false;

        [...(<HTMLCollectionOf<HTMLInputElement>>this.els.inputList.getElementsByClassName("bText"))]
        .forEach((el, i)=>{
            if (el.classList.contains("js-invalid")) {
                if (!this.checkDuplicates(i, this.playerList[i].name)) {
                    el.classList.remove("js-invalid");
                }
                else {
                    isInvalidInput = true;
                }
            }
            if (!el.classList.contains("js-invalid")) {
                this.playerList[i].reservedName = this.playerList[i].name;
            }
        });

        // TO-DO: disable the button "Start"
        if (isInvalidInput) {
            console.log("invalid input");
        }
    }


    private createPlayerInput(playerListIndex?: number) {
        const clone = this.templatePlayerInput.content.cloneNode(true) as DocumentFragment;
        let inputValue: string;

        let resultLength = this.playerList.length;

        if (playerListIndex!==undefined) {
            inputValue = this.playerList[playerListIndex].name;
        }
        else {
            resultLength+=1;

            inputValue = `Игрок ${resultLength}`;
            if (this.playerList.some((val)=>(val.name === inputValue))) {
                inputValue = this.getNewName();
            }

            this.playerList.push(this.createObjPlayer(inputValue));
        }

        const bText = (clone.querySelector(".bText") as HTMLInputElement);
        bText.value = inputValue;

        this.els.inputList.appendChild(clone);

        this.updatePlayerList(resultLength);
    }
    private deletePlayerInput(el: Element) {
        const index = this.findInstanceIndex(el);

        this.playerList.splice(index, 1);
        
        el.remove();

        this.updatePlayerList(this.playerList.length);
        this.updateInputs();
    }
    private movePlayerInput(el: Element, by: -1|1) {
        const sourceIndex = this.findInstanceIndex(el);
        const sourceVal = this.playerList.splice(sourceIndex, 1)[0];
        this.playerList.splice(sourceIndex+by, 0, sourceVal);

        el.remove();
        this.els.inputList.insertBefore(el, this.els.inputList.children[sourceIndex+by]);

        el.classList.add("anim-green");

        this.updatePlayerList(this.playerList.length);
    }


    setEvents() {
        this.els.playerList.addEventListener("click", (event)=>{
            const target = <Element>event.target;

            let foundEl = target.closest(".bAdd");
            
            if (foundEl) {
                this.createPlayerInput();
                return;
            }
            foundEl = target.closest(".bUp");
            if (foundEl) {
                this.movePlayerInput(<HTMLElement>foundEl.closest(".instance"), -1);
                return;
            }
            foundEl = target.closest(".bDown");
            if (foundEl) {
                this.movePlayerInput(<HTMLElement>foundEl.closest(".instance"), 1);
                return;
            }
            foundEl = target.closest(".bRemove");
            if (foundEl) {
                this.deletePlayerInput(<HTMLElement>foundEl.closest(".instance"));
                return;
            }
        });


        this.els.inputList.addEventListener("focus", (event)=>{
            const target = (<HTMLInputElement>event.target);
            if (!target.closest(".bText")) return;
            const index = this.findInstanceIndex(target);

            this.elFocusedInput = {
                el: target,
                index: index
            };
        }, true);
        this.els.inputList.addEventListener("input", (event)=>{
            if (!this.elFocusedInput) return;
            const el = this.elFocusedInput.el;
            const index = this.elFocusedInput.index;
            const value = el.value.trim().replace(/ +/g, " ");
            this.playerList[index].name = value;
            
            // check for duplicates
            this.elFocusedInput.el.classList.toggle("js-invalid", this.checkDuplicates(index, value));
        }, true);
        this.els.inputList.addEventListener("change", (event)=>{
            if (!this.elFocusedInput) return;
            const el = this.elFocusedInput.el;
            const index = this.elFocusedInput.index;
            const value = el.value.trim().replace(/ +/g, " ");

            if (value === "") {
                const inputValue =
                    (this.checkDuplicates(index, this.playerList[index].reservedName))
                    ? this.getNewName()
                    : this.playerList[index].reservedName;

                el.value = inputValue;
                this.playerList[index].name = inputValue;
            }
            this.updateInputs();

        }, true);

        // remove the class after the animation has finished
        this.els.inputList.addEventListener("animationend", (event)=>{
            (<HTMLElement>event.target).closest(".instance")?.classList.remove("anim-green");
        });
    }

    createInner() {
        g.playerList.forEach((playerName)=>{
            this.playerList.push(this.createObjPlayer(playerName));
        });

        this.playerList.forEach((_, i)=>{
            this.createPlayerInput(i);
        });
    }
    destroyInner() {
        this.playerList.splice(0);

        this.els.inputList.textContent = "";
    }

    exportPlayerList() {
        if (this.playerList.length !== 0) { // don't overwrite empty player list
            g.playerList = this.playerList.map((player)=>(player.reservedName));
        }
    }

    lengthIsEqual() {
        return (this.playerList.length === 0) || (g.playerList.length === this.playerList.length);
    }
}

/** In stage `choosePlayers`: Timer's term */
class TimerTerm extends AStageConstituent {
    mainEl = document.getElementById("timerTermPos")!;

    setEvents(): void {}
}

interface MinsAndSecs {
    mins: number,
    secs: number
}
class TimerInputPersistent extends AStageConstituent {
    private els = {
        timer: document.getElementById("setTimer")!,
        timerInputM: <HTMLInputElement>document.getElementById("timerInputM"),
        timerInputS: <HTMLInputElement>document.getElementById("timerInputS")
    };
    mainEl = document.getElementById("timerPos")!;

    /** Changes the property argument `time` */
    private getTimeObject() {
        return {
            mins: parseInt(this.els.timerInputM.value) || 0,
            secs: parseInt(this.els.timerInputS.value) || 0
        }
    }

    private processSecondsInput(time: MinsAndSecs) {
        if (time.mins <= 0 && time.secs < 0) {
            time.secs = 0;
        }
        else if (time.mins >= 99 && time.secs > 59) {
            time.secs = 59;
        }
        
        while (time.secs >= 60) {
            time.mins += 1;
            time.secs -= 60;
        }
        while (time.secs < 0) {
            time.mins -= 1;
            time.secs += 60;
        }

        time.mins = F.clamp(time.mins, 0, 99);

        this.els.timerInputM.value = String(time.mins);
        this.els.timerInputS.value = String(time.secs);
    }

    private grayNumbers(time: MinsAndSecs) {
        this.els.timer.classList.toggle("js-gray-inputs", (time.mins === 0 && time.secs === 0));
    }

    constructor() {
        super();
    }

    setEvents() {
        this.els.timerInputM.addEventListener("input", (event: InputEvent)=>{
            let passInput = false;

            if (this.els.timerInputM.value.length > 2 && (event.inputType === "insertText")) {
                passInput = true;
                this.els.timerInputM.value = this.els.timerInputM.value.slice(0, -1);
                this.els.timerInputS.value = String(event.data);
            }

            const time = this.getTimeObject();

            if (passInput) {
                this.processSecondsInput(time);

                this.els.timerInputS.focus();
            }
            else {
                time.mins = F.clamp(time.mins, 0, 99);
                this.els.timerInputM.value = String(time.mins);

                this.grayNumbers(time);
            }
        });
        this.els.timerInputS.addEventListener("input", ()=>{
            const time = this.getTimeObject();
            
            if (this.els.timerInputS.value.length > 2) {
                this.els.timerInputS.value = this.els.timerInputS.value.slice(0, -1);
            }
            else {
                this.processSecondsInput(time);
                this.grayNumbers(time);
            }
        });
    }

    /** Set timer to `g.timer.seconds` */
    exportTimeInputs() {
        const time = this.getTimeObject();
        g.timer.seconds = F.toSeconds(time.mins, time.secs);
    }

    /** Transfer `g.timer.seconds` to inputs */
    importTimeInputs() {
        const time = F.toMinsAndSecs(g.timer.seconds);
        this.els.timerInputM.value = String(time.mins);
        this.els.timerInputS.value = String(time.secs);

        this.grayNumbers(time);
    }
}

/** In stage `table`: Holds player score and controls moves */
class TablePersistent extends AStageConstituent {
    private els = {
        table: <HTMLDivElement>document.getElementById("tablePos"),

        thead: <HTMLDivElement>document.querySelector("#tablePos .header"),
        theadRow: <HTMLDivElement>document.querySelector("#tablePos .header .row"),
        theadCells: new Array<HTMLElement>(),

        tbody: <HTMLDivElement>document.querySelector("#tablePos .body"),
        tbodyCells: new Array<HTMLElement>(),

        tfoot: <HTMLDivElement>document.querySelector("#tablePos .footer"),
        tfootRow: <HTMLDivElement>document.querySelector("#tablePos .footer .row"),
        tfootCells: new Array<HTMLElement>(),
    }
    mainEl = this.els.table;

    public needShrinkPlayers = false;

    private cellI!: number;
    private cell!: HTMLElement;

    private initTable() {
        this.els.table.classList.toggle("js-twoRows", (g.playerList.length <= 2));

        // HTML: table header and footer
        {
            this.els.theadRow.textContent = "";
            this.els.tfootRow.textContent = "";
            for (const player of g.playerList) {
                this.els.theadRow.appendChild(createEl("div", {class: "cell js-shrinkToFit", text: player, role: "columnheader"}));
                this.els.tfootRow.appendChild(createEl("div", {class: "cell", text: "0", role: "gridcell"}));
            }

            this.els.theadCells = <HTMLElement[]>Array.from(this.els.theadRow.children);
            this.els.tbodyCells.length = 0;
            this.els.tfootCells = <HTMLElement[]>Array.from(this.els.tfootRow.children);
        }
        // HTML: table body
        {
            this.els.tbody.textContent = "";
            this.cellI = -1;
            this.createMoveCell();
            // the property `this.cell` is always defined later
        }
        this.needShrinkPlayers = true;
    }


    /** Fills data from the global properties in the table. */
    setData() {
        this.initTable();

        g.roundI = 0;
        g.playerTurnI = 0;
        
        if (g.tableIsEmpty()) {
            // new table
            for (let i = 0; i < g.playerList.length; i++) {
                // fill empty data to `g.table`
                g.table.push({
                    moves: [],
                    score: 0
                });
            }
        }
        else {
            // fill cells that exists in `g.table`
            const moves: MoveDataWithScore[] = [];

            // read cells horizontally
            const maxRowLength = Math.max(...g.table.map((column)=>(column.moves.length)));
            for (let row = 0; row < maxRowLength; row++) {
                for (let column = 0; column < g.table.length; column++) {
                    const move = g.table[column].moves[row];
                    if (move) {
                        moves.push(move);
                    }
                }
            }

            moves.forEach((move)=>{
                this.makeMove(move, true);
            });

            g.table.forEach((playerMoves)=>{
                this.setTotalPlayerScore(playerMoves);
            });
        }

        s.word_controller.resetValues();
        this.updateTableAndTextInfo();
    }

    tryShrinkToFitTexts() {
        if (this.needShrinkPlayers) {
            this.els.theadCells.forEach((elCell)=>{
                C.shrinkToFit(elCell);
            });
            this.needShrinkPlayers = false;
        }
    }

    setEvents(): void {
        this.els.table.addEventListener("click", (event)=>{
            const targetEl = <HTMLElement | null>event.target;
            if (!targetEl) return;

            const closestEl = <HTMLElement | null>(targetEl).closest(".cell.js-filled");
            if (!closestEl || targetEl === closestEl) return;
            
            const index = this.els.tbodyCells.indexOf(closestEl);
            if (index === -1) return;

            s.move_info_controller.handleClick(index, closestEl);
        });
    }

    makeMove(moveData: MoveDataWithScore, dontCountScore=false) {
        // HTML: fill in the current cell
        this.cell.classList.remove("js-active");
        this.cell.classList.add("js-filled");
        this.cell.children[0].textContent = String(moveData.points);

        // enter data into `g.table`
        if (!dontCountScore) {
            const playerMoves = g.table[g.playerTurnI];
            playerMoves.moves.push(moveData);
            this.setTotalPlayerScore(playerMoves);
        }
        
        // pass to the next player, and so on in a circle
        g.playerTurnI += 1;
        if (g.playerTurnI >= g.playerList.length) {
            g.roundI += 1;
            g.playerTurnI = 0;
        }

        this.createMoveCell();
        this.updateTableAndTextInfo();
    }

    private setTotalPlayerScore(playerMoves: PlayerMoves) {
        const playerI = g.table.indexOf(playerMoves);
        // calculate the player's total score
        playerMoves.score = F.sum(...playerMoves.moves.map((move)=>(move.points)));
        // HTML: fill in the footer cell
        this.els.tfootCells[playerI].textContent = String(playerMoves.score);
    }

    /** @returns the last move */
    extractLastMove() {
        g.playerTurnI -= 1;
        if (g.playerTurnI < 0) {
            g.roundI -= 1;
            g.playerTurnI = g.playerList.length-1;
        }

        const extractedLastMove = g.table[g.playerTurnI].moves.pop()!
        this.setTotalPlayerScore(g.table[g.playerTurnI]);

        this.cell.classList.remove("js-active");

        this.cellI -= 1;
        this.cell = this.els.tbodyCells[this.cellI];

        this.cell.classList.remove("js-filled");
        this.cell.classList.add("js-active");
        this.cell.children[0].textContent = "";

        this.updateTableAndTextInfo();

        return extractedLastMove;
    }

    private createMoveCell() {
        this.cellI += 1;

        if (this.cellI >= this.els.tbodyCells.length) {
            // create a row and reserve cells space of this row

            const row = createEl("div", {class: "row", role: "row"});

            for (let i = 0; i < g.playerList.length; i++) {
                const cell = createEl("div", {class: "cell", role: "gridcell", children: [createEl("div", {})]});
                
                this.els.tbodyCells.push(cell);
                row.appendChild(cell);
            }

            this.els.tbody.appendChild(row);
        }

        this.cell = this.els.tbodyCells[this.cellI];
        this.cell.classList.add("js-active");
    }


    private updateTableAndTextInfo() {
        // update round number
        s.player_turn_text_info.subRoundNumber.text = `Круг № ${g.roundI+1}`;
        // update player turn
        s.player_turn_text_info.subCurrentPlayerTurn
            .text = g.playerList[g.playerTurnI];
        s.make_move_text_info.subPlayerName.text = g.playerList[g.playerTurnI];
        
        s.timer_text_info.subPlayerName.text = `${g.playerList[g.playerTurnI]} ходит`;


        this.els.theadCells.forEach((elCell, i)=>{
            elCell.classList.toggle("js-active", (i === g.playerTurnI));
        });

        this.updateScrolling();
    }

    private updateScrolling() {
        // assign the visible scroll bar width to the variable using JavaScript
        this.els.table.style.setProperty("--scrollbar-width", `${this.els.tbody.offsetWidth - this.els.tbody.clientWidth}px`);
    }
    
    
    updateTableAppearance() {
        this.els.table.classList.toggle("js-outline", (g.settings.outlineOfTheTable));
        this.els.table.classList.toggle("js-moveInfo", (s.move_info_controller.cellI !== -1));

        this.updateScrolling();
        // When opening move info, scroll to the view of the selected cell
        s.move_info_controller.elCell ?.scrollIntoView({block: "nearest", inline: "nearest"});
    }
}

class WordList extends AStageConstituent {
    private els = {
        list: document.querySelector("#wordListPos") as HTMLElement
    };
    mainEl = this.els.list;

    private templateWordListItem = document.getElementById("templateWordListItem") as HTMLTemplateElement;
    
    setEvents(): void {
        this.els.list.addEventListener("click", (event)=>{
            const target = <HTMLElement>event.target;
            const closest = target.closest("li");
            if (closest) {
                if (!closest.classList.contains("js-canBeDeleted")) {
                    this.deselectItems();
                    closest.classList.add("js-canBeDeleted");
                }
                else {
                    this.deleteItem(closest);
                }
            }
        });
    }

    addItem(word: string, points: number) {
        const item = this.templateWordListItem.content.cloneNode(true) as DocumentFragment;
        
        const elWord = item.querySelector(".word")!;
        elWord.textContent = word;

        const elPoints = item.querySelector(".points")!;
        elPoints.textContent = String(points);

        this.els.list.appendChild(item);
    }
    private deleteItem(el: HTMLElement) {
        const wordItemIndex = Array.from(this.els.list.children).indexOf(el);
        // delete a word from `s.make_move_controller.newMove.words`
        s.make_move_controller.newMove.words.splice(wordItemIndex, 1);
        s.make_move_controller.updateWordCount();
        s.make_move_controller.updatePoints();

        el.remove();
        messages.broadcast(Msg.UPDATE_MOVE_STATE_BUTTON);
    }
    deleteLastItem() {
        if (s.make_move_controller.newMove.words.length > 0) {
            this.deleteItem(<HTMLElement>this.els.list.lastElementChild);
        }
    }
    eraseItems() {
        this.els.list.textContent = "";
    }

    deselectItems() {
        (<Array<HTMLElement>> Array.from(this.els.list.children))
        .forEach((child)=>{
            child.classList.remove("js-canBeDeleted");
        });
    }
}


class HelpDoc extends AStageConstituent {
    mainEl = document.getElementById("helpPos")!;
    readonly htmlPages = `
        <div class="page hide space-after-paragraphs">
            <p class="t-center bold">Эрудит — это игра в слова на находчивость, напоминающая кроссворд,
                но без вопросов! Вам нужно создавать единый кроссворд с помощью данных букв!</p>
            
            <p class="t-center">
                <span class="bold t-big">2-4 игрока</span>
                <br>
                <span class="italic">или 2-4 команды, в каждой из которых равное количество игроков.</span>
            </p>

            <p class="t-center c-purple bold">7 минут для ознакомления с правилами игры с нуля</p>
        </div>

        <div class="page hide space-after-paragraphs">
            <p class="c-purple">Решают, кто ходит первым, различным способом, но от них игроки
                путаются. Есть чёткий способ.</p>
            
            <p>Для начала вспомним наш алфавит. Каждый игрок вынимает из мешочка одну фишку.
                Первым ходит тот, у кого имеется буква, ближайшая к началу алфавита, или
                фишка-звёздочка. Затем уберите фишки в мешочек.</p>
        </div>

        <div class="page hide space-after-paragraphs">
            <ol class="page space-after-paragraphs">
                <li>Игровое поле обращается к Вам — это ваша очередь. Не подглядывая, достаньте из
                    мешочка столько фишек, чтобы у Вас стало 7.</li>
                <li>Подумайте, какое слово можно составить из этих букв, и выложите фишки на доску.</li>
                <li>Счетовод подсчитает Ваши очки за составленные слова как сумму циферок рядом с
                    каждой буквой, и ход перейдёт к следующему игроку.
                </li>
            </ol>

            <div class="offset  js-pieceOfBoard">
                <img loading="eager" src="./assets/html_used/help_doc_img-2-0.svg" width="264" height="114">

                <div class="js-chips" data-word="коза" style="
                    --x: 34px; --y: 34px;
                "></div>
            </div>

            <div class="frame info">
                Словом является слово, которое есть в русском языке — нарицательное имя существительное
                <span class="italic">(кот, погода, уборка и т.п.)</span>
                <br>
                Буква «е» также воспринимается как «ё» <span class="italic">(
                    кл<span class="underline">ё</span>н
                    — кл<span class="underline">е</span>н
                )</span>.

                <br>
                <span class="italic">Или можно использовать слова любой части речи, но это правило будет применяться всем игрокам.</span>
            </div>
        </div>

        <div class="page hide space-after-paragraphs">
            <p>Первый игрок выкладывает фишки на доску так, чтобы любая из них коснулась центральной звезды
                <br>
                А далее — любым из следующих способов:
            </p>

            <ul class="page space-after-paragraphs bold">
                <li>Разложить слово поперёк другого слова:

                    <div class="flex space-between">
                        <div class="js-pieceOfBoard" style="
                            --chip-size: 23px; --gap: 2px;
                        ">
                            <img loading="eager" src="./assets/html_used/help_doc_img-3-0.svg" width="154" height="154">

                            <div class="js-chips" data-word="цирк" style="
                                --x: 28px;  --y: 28px;
                            "></div>
                            <div class="js-chips" data-word=" люв" data-vertical style="
                                --x: 103px; --y: 28px;
                            "></div>
                        </div>

                        <div class="js-pieceOfBoard" style="
                            --chip-size: 23px; --gap: 2px;
                        ">
                            <img loading="eager" src="./assets/html_used/help_doc_img-3-1.svg" width="154" height="154">

                            <div class="js-chips" data-word="цирк" style="
                                --x: 28px; --y: 65px;
                            "></div>
                            <div class="js-chips" data-word="со ол" data-vertical style="
                                --x: 103px; --y: 15px;
                            "></div>
                        </div>

                        <div class="js-pieceOfBoard" style="
                            --chip-size: 23px; --gap: 2px;
                        ">
                            <img loading="eager" src="./assets/html_used/help_doc_img-3-2.svg" width="154" height="154">

                            <div class="js-chips" data-word="цирк" style="
                                --x: 28px; --y: 53px;
                            "></div>
                            <div class="js-chips" data-word="т гр" data-vertical style="
                                --x: 53px; --y: 28px;
                            "></div>
                        </div>
                    </div>

                </li>
                <li>Добавить буквы к уже сложенному слову:
                
                    <div class="js-pieceOfBoard" style="
                        --chip-size: 35px; --gap: 2.5px;
                    ">
                        <img loading="eager" src="./assets/html_used/help_doc_img-3-3.svg" width="312" height="87">

                        <div class="js-chips" data-word="котенок" style="
                            --x: 26px; --y: 26px;
                        "></div>
                    </div>
                    <div class="js-pieceOfBoard" style="
                        --chip-size: 35px; --gap: 2.5px;
                    ">
                        <img loading="eager" src="./assets/html_used/help_doc_img-3-4.svg" width="237" height="87">

                        <div class="js-chips" data-word="икота" style="
                            --x: 26px; --y: 26px;
                        "></div>
                    </div>
                </li>
                <li>Сделать «мостик» между фишками:
                
                    <div class="js-pieceOfBoard" style="
                        --chip-size: 23px; --gap: 2px;
                    ">
                        <img loading="eager" src="./assets/html_used/help_doc_img-3-5.svg" width="184" height="184">

                        <div class="js-chips" data-word="борода" data-vertical style="
                            --x: 93px; --y: 18px;
                        "></div>
                        <div class="js-chips" data-word="плот" data-vertical style="
                            --x: 43px; --y: 68px;
                        "></div>
                        <div class="js-chips" data-word=" р ва" style="
                            --x: 43px; --y: 143px;
                        "></div>
                        <div class="js-chips" data-word="с о т" style="
                            --x: 18px; --y: 68px;
                        "></div>
                    </div>
                </li>
            </ul>
        </div>

        <div class="page hide space-after-paragraphs">
            <ul class="frame red space-after-paragraphs">
                <li>Раскладывайте слова слева направо, либо сверху вниз.</li>
                <li>Нельзя оставлять пробелы и бессмысленные изгибы в словах.

                    <div class="js-pieceOfBoard" style="
                        --chip-size: 27px; --gap: 3px;
                    ">
                        <img loading="eager" src="./assets/html_used/help_doc_img-4-0.svg" width="311" height="161">

                        <div class="js-chips" data-word="раду" data-vertical style="
                            --x: 22px; --y: 22px;
                        "></div>
                        <div class="js-chips" data-word="га мечты" style="
                            --x: 52px; --y: 112px;
                        "></div>
                    </div>
                </li>
            </ul>

            <ul class="frame green space-after-paragraphs">
                <li>Можно разложить несколько слов за один ход.</li>
                <li>Можно повторять слова.</li>
                <li>Можно использовать букву «е» как букву «ё».</li>
            </ul>

            <ul class="frame yellow space-after-paragraphs">
                <li>Если неудобно выкладывать фишки, можно вставать со стула.</li>
                <li>Не стесняйтесь спрашивать правило и есть ли такое слово или нет.</li>
                <li>Если слово не придумывается, попробуйте переставить фишки между собой,
                    можно прямо на доске. Старайтесь сильно не задевать старые фишки.</li>
                <li>Если слово всё равно не придумывается, пропустите ход, при необходимости замените фишки.</li>
            </ul>
        </div>

        <div class="page hide space-after-paragraphs">
            <p class="star-row">
                <img src="./assets/elements/star.svg" alt="звёздочка" style="margin-right: 5px;">
                <span>
                    Фишка-звёздочка может стать любой буквой. После того, как вы выложили её на доску
                    вместо определённой буквы, например «и», она превратится в букву «и» до конца игры.
                    Фишки-звёздочки не имеют количество очков.
                </span>
            </p>

            <div>
                <p class="bold margin">Множители:</p>
                <div class="multiplier-row">
                    <img class="bold" src="./assets/chips/multipliers/letter_x2.svg" alt="x2" style="color: #46DB61;">
                    <img class="bold" src="./assets/chips/multipliers/letter_x3.svg" alt="x3" style="color: #46872B;">
                    <span>— умножают очки этой буквы</span>
                </div>
                <div class="multiplier-row">
                    <img src="./assets/chips/multipliers/word_x2.svg" alt="x2" style="color: #C45B3E;">
                    <img src="./assets/chips/multipliers/word_x3.svg" alt="x3" style="color: #D8A929;">
                    <span>— умножают очки этого слова</span>
                </div>
            </div>

            <p>Использовали все фишки? Счетовод прибавит к Вашему счёту ещё <span id="bonusPointsNumber">50</span> очков.</p>
        </div>

        <div class="page hide space-after-paragraphs">
            <p class="c-purple">Если израсходовать все фишки из мешочка, то игра продлится в
                среднем 1 час 30 минут, а если игроки сообразительные, — около 40 минут.</p>

            <p>Отложить игру на следующий день или закончить можно в любой момент.</p>

            <p class="c-purple"><span class="bold">Это приложение сохраняет табло.</span> Только
                не забудьте сфотографировать игровое поле и оставшиеся фишки игроков, с которых
                можно продолжить игру.</p>

            <p>При окончании игры у игроков вычитаются очки за их оставшиеся фишки.
                Выиграет тот, у кого больше всего очков.</p>
            
            <p class="t-center bold t-big">Желаю удачи!</p>
        </div>
    `;

    private elPages: HTMLElement[] = [];

    setEvents(): void {
        
    }

    createInner() {
        this.mainEl.innerHTML = this.htmlPages;
        this.elPages = Array.from(this.mainEl.querySelectorAll<HTMLElement>("div.page"));

        // place chips into the HTML pages
        this.placeChips();
    }

    private placeChips() {
        for (const elBoard of this.mainEl.getElementsByClassName("js-pieceOfBoard")) {
            for (const elChipPlacement of elBoard.getElementsByClassName("js-chips")) {
                elChipPlacement.appendChild(
                    g.chipMaker.makeChipsF((<HTMLElement>elChipPlacement).dataset.word!)
                );
            }
        }
    }
    
    destroyInner() {
        this.elPages.length = 0;
        this.mainEl.textContent = "";
    }

    showCurrentPage() {
        this.elPages.forEach((elPage, i)=>{
            elPage.classList.toggle("hide", (i !== s.help_controller.pageN));
        });
    }
}


class PlayerScores extends AStageConstituent {
    private els = {
        list: document.getElementById("playerScoresPos")!
    };
    mainEl = this.els.list;

    private templatePlayerScoreItem = document.getElementById("templatePlayerScoreItem") as HTMLTemplateElement;
    private currentItemEl: Element|null = null;

    setEvents(): void {
        
    }

    createInner() {
        for (let i = 0; i < g.playerList.length; i++) {
            const elItem = this.templatePlayerScoreItem.content.cloneNode(true) as DocumentFragment;
            elItem.querySelector(".player-name")!.textContent = g.playerList[i];
            elItem.querySelector(".score")!.textContent = String(s.finish_game_controller.finalScore[i]);

            this.els.list.appendChild(elItem);
        }

        this.currentItemEl = this.els.list.firstElementChild!;
        this.currentItemEl.classList.add("active");
    }
    shrinkToFitTexts() {
        for (const elItem of this.els.list.children) {
            const elPlayerName = elItem.getElementsByClassName("player-name")[0];
            C.shrinkToFit(<HTMLElement>elPlayerName);
        }
    }

    doneItem(finalScore: number) {
        if (this.currentItemEl) {
            this.currentItemEl.classList.remove("active");
            this.currentItemEl.classList.add("done");

            (<HTMLElement>this.currentItemEl).dataset.score = String(finalScore);

            this.currentItemEl.getElementsByClassName("score")[0].textContent = String(finalScore);
        }
    }
    nextItem() {
        if (this.currentItemEl) {
            this.currentItemEl = this.currentItemEl.nextElementSibling;
            this.currentItemEl?.classList.add("active");
        }
    }

    sortLeaderboard() {
        const elItems = Array.from(<HTMLCollectionOf<HTMLElement>>this.els.list.children);

        // Sort by score descending
        elItems.sort((a, b)=> {
            const scoreA = Number(a.dataset.score);
            const scoreB = Number(b.dataset.score);

            return scoreB - scoreA;
        });

        let currentPlace = 1;
        let previousScore = 0;

        elItems.forEach((elItem, i)=>{
            elItem.classList.remove("gold", "silver", "bronze");

            if (i > 0) {
                const currentScore = Number(elItem.dataset.score);
                
                // If the score is different, update rank to the actual 1-based index position
                if (currentScore !== previousScore) {
                    currentPlace = i + 1;
                }

                previousScore = currentScore;
            }

            if (currentPlace === 1) elItem.classList.add("gold");
            if (currentPlace === 2) elItem.classList.add("silver");
            if (currentPlace === 3) elItem.classList.add("bronze");

            // Move the child to the last order
            this.els.list.appendChild(elItem);
        });
    }

    destroyInner() {
        this.mainEl.textContent = "";
        this.currentItemEl = null;
    }
}


/** A collection of HTML elements with their defined logic and JavaScript events */
export const o = {
    inputFields: new InputFields(),
    timerTerm: new TimerTerm(),
    timerInput: new TimerInputPersistent(),
    table: new TablePersistent(),
    wordList: new WordList(),
    help: new HelpDoc(),
    playerScores: new PlayerScores()
};
