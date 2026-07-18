import { ChipMaker } from "@/sprites/chip_maker";
import * as F from "@/core/functions";


interface MoveData {
    words: WordData[],
    usedAllChips: boolean
}
interface WordData {
    word: string,
    /**
     * ```text
     * 0 - no
     * 1 - x2 for letter
     * 2 - x3 for letter
     * 3 - x2 for word
     * 4 - x3 for word
     * 5 - star chip
     * 6 - star chip & x2 for letter
     * 7 - star chip & x3 for letter
     * 8 - star chip & x2 for word
     * 9 - star chip & x3 for word
     * ```
     */
    multipliers: string
}

export interface MoveDataWithScore extends MoveData {
    points: number,
    words: WordDataWithScore[]
}
interface WordDataWithScore extends WordData {
    points: number
}

export interface SavedData {
    table: {
        player: string,
        moves: MoveData[]
    }[],
    timer?: typeof g.timer
};
export interface PlayerMoves {
    score: number,
    moves: MoveDataWithScore[]
}

export type GameStages = "mainMenu"|"choosePlayers"|"table"|"makeMove"|"timer"|"moveInfo"|"help"|"finishGame"|"gameFinished";
class GlobalProperties {
    stage!: GameStages; // initialized later
    reservedStage: (typeof this.stage)|null = null;

    chipMaker = new ChipMaker();

    readonly FONT_STACK = '"Calibri", "Carlito", sans-serif';
    readonly COLOR_PALETTE = Object.freeze({
        greenText: "#50ff50",
        redText: "#ff8080",
        goldenText: "#e5d497",
        darkBlueText: "#000080",

        lightGreen: "#adf58c",
        lightCyan: "#87ece7",
        lightPurple: "#c5a1ff",
        lightGolden: "#e2cf78",
        lightOrange: "#d3b07d",
        lightGray: "#b9bdc2",
        purple: "#7b5ef6",
        darkCyan: "#108291",
        disabled: "#555555",

        transPurple: "#8d5ec480",
        transBlack: "#00000080",
        transWhite: "#ffffff80",
        dullGreen: "#b8c9c0"
    });


    playerTurnI = 0;
    roundI = 0;

    table: PlayerMoves[] = [];

    tableIsEmpty() {
        return (this.table.length === 0);
    }
    clearTable() {
        this.table.length = 0;
    }

    wordList!: Set<string>;

    // default values
    playerList: string[] = ["Игрок 1", "Игрок 2"];
    timer = {
        seconds: 0,
        /** Direct global setting */
        isGameTimer: false, 
        /** Direct global setting */
        startImmediately: false,
        /** Direct global setting */
        tickSound: false
    };
    settings = {
        outlineOfTheTable: false,
        
        theme: <"Словодел"|"Скрибли-Бумс!"> "Скрибли-Бумс!",
        customLetterValues: <number[]|null> null,
        bonusPoints: 50,

        userWordList: new Set<string>()
    };


    private stringData: string|null = localStorage.getItem("scrabble_counter");
    loadStorageData(category: "tableSettings"|"tableData") {
        try {
            const savedData: SavedData|null = (this.stringData) ? JSON.parse(this.stringData) : null;
        
            if (savedData) {
                try {
                    if (category === "tableSettings") {
                        this.playerList = savedData.table.map((entry)=>(entry.player));
                    }

                    if (category === "tableData") {
                        this.table = savedData.table.map((tableData)=>({
                            moves: tableData.moves.map((moveData)=>{
                                const words = moveData.words.map((wordData)=>({
                                    word: wordData.word,
                                    multipliers: wordData.multipliers,
                                    points: calculateWordPoints(wordData.word, wordData.multipliers)
                                }));

                                return {
                                    words: words,
                                    usedAllChips: moveData.usedAllChips,
                                    points: calculateMovePoints(words.map((word)=>(word.points)), moveData.usedAllChips)
                                };
                            }),

                            score: 0
                        }));

                        console.log("Table loaded successfully!");
                        
                        const moves: MoveDataWithScore[] = [];

                        const maxRowLength = Math.max(...g.table.map((column)=>(column.moves.length)));
                        for (let row = 0; row < maxRowLength; row++) {
                            for (let column = 0; column < g.table.length; column++) {
                                const move = g.table[column].moves[row];
                                if (move) {
                                    moves.push(move);
                                }
                            }
                        }
                    }
                }
                catch (_) {}
            }

            if (category === "tableSettings") {
                const timer = savedData?.timer;
                if (timer?.seconds) this.timer.seconds = timer.seconds;
                if (timer?.isGameTimer) this.timer.isGameTimer = timer.isGameTimer;
                if (timer?.startImmediately) this.timer.startImmediately = timer.startImmediately;
                if (timer?.tickSound) this.timer.tickSound = timer.tickSound;
            }
        }
        catch (_) {}
    }
    saveStorageData() {
        const savedData: SavedData = {
            table: g.table.map((playerMoves, playerI)=>({

                moves: playerMoves.moves.map((moveDataWithScore)=>({

                    words: moveDataWithScore.words.map((wordDataWithScore)=>({
                        word: wordDataWithScore.word,
                        multipliers: wordDataWithScore.multipliers
                    })),
                    usedAllChips: moveDataWithScore.usedAllChips

                })),

                player: g.playerList[playerI]
                
            })),

            timer: g.timer
        };

        this.stringData = JSON.stringify(savedData);
        localStorage.setItem("scrabble_counter", this.stringData);
        
        console.log("Table saved successfully!");
    }
}


export namespace ChipMultiplier {
    export type Literal = "letter_x2"|"letter_x3"|"word_x2"|"word_x3"|"";

    export const NUMBERS: Record<Literal, number> = {
        "": 0,
        "letter_x2": 1,
        "letter_x3": 2,
        "word_x2": 3,
        "word_x3": 4
    };
    export const LITERALS: Record<number, Literal> = {
        0: "",
        1: "letter_x2", 
        2: "letter_x3",
        3: "word_x2",
        4: "word_x3"
    };

    export function numberToProps(multiplierN: number|string) {
        const multiplierNN = Number(multiplierN ?? 0);
        const star = (multiplierNN >= 5);
        const multiplierLiteral = LITERALS[(multiplierNN % 5)];
        return {multiplierLiteral, star};
    }

    export function propsToNumber(multiplierLiteral: Literal, star: boolean) {
        return NUMBERS[multiplierLiteral] + (star ? 5 : 0);
    }
}
export function calculateWordPoints(word: string, multipliers: string) {
    let wordPoints = 0;
    let wordMultiply = 1;
    for (let i = 0; i < word.length; i++) {
        const multiplierObject = ChipMultiplier.numberToProps(multipliers[i]);
        const multiplierLiteral = multiplierObject.multiplierLiteral;

        let letterValue = (multiplierObject.star) ? 0 : g.chipMaker.LETTER_VALUES[g.chipMaker.getLetterN(word[i])];
        if (letterValue !== 0) {
            if (multiplierLiteral === "letter_x2") {
                letterValue *= 2;
            }
            else if (multiplierLiteral === "letter_x3") {
                letterValue *= 3;
            }
        }
        if (multiplierLiteral === "word_x2") {
            wordMultiply *= 2;
        }
        else if (multiplierLiteral === "word_x3") {
            wordMultiply *= 3;
        }

        wordPoints += letterValue;
    }

    return wordPoints * wordMultiply;
}
export function calculateMovePoints(points: number[], usedAllChips: boolean) {
    const pointsSum = F.sum(...points);
    return (
        pointsSum + ((usedAllChips && pointsSum!==0) ? g.settings.bonusPoints : 0)
    );
}


/** Global properties are initialized immediately before loading assets. */
export const g = new GlobalProperties();