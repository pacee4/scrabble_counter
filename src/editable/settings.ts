import type { ResourcesToLoad } from "@/core/asset_loader";

export const settings: Readonly<{
    SCREEN_WIDTH: number,
    SCREEN_HEIGHT: number,
    MAX_LAYERS?: number
    IS_PROJECT?: boolean
}>
= Object.freeze({
    SCREEN_WIDTH: 640,
    SCREEN_HEIGHT: 360,
    IS_PROJECT: true
} as const)

export function getResourcesToLoad(): ResourcesToLoad {
    return {
        images: {
            "letter_x2-m": "./assets/chips/multipliers/letter_x2.svg",
            "letter_x3-m": "./assets/chips/multipliers/letter_x3.svg",
            "word_x2-m": "./assets/chips/multipliers/word_x2.svg",
            "word_x3-m": "./assets/chips/multipliers/word_x3.svg",

            "background": "./assets/background.svg",
            "background-help": "./assets/background-help.svg",
            "background_particle-1": "/assets/background_particle-1.svg",
            "background_particle-2": "/assets/background_particle-2.svg",
            "background_particle-3": "/assets/background_particle-3.svg",

            "box-1": "./assets/elements/box-1.svg",

            "midground-table": "./assets/midground-table.svg",
            "midground-makeMove": "./assets/midground-makeMove.svg",
            "midground-timer": "./assets/midground-timer.svg",
            "midground-moveInfo": "./assets/midground-moveInfo.svg",
            "midground-help": "./assets/midground-help.svg",
            "midground-finishGame": "./assets/midground-finishGame.svg",

            "title": "./assets/title.png",
            "game_over_title": "./assets/game_over_title.png",

            "checkbox": "./assets/elements/checkbox.svg",
            "checkbox-p": "./assets/elements/checkbox-p.svg",
            "checkbox-checked": "./assets/elements/checkbox-checked.svg",
            "checkbox-p-checked": "./assets/elements/checkbox-p-checked.svg",
            "letter_x2": "./assets/elements/letter_x2.svg",
            "letter_x2-p": "./assets/elements/letter_x2-p.svg",
            "letter_x2-checked": "./assets/elements/letter_x2-checked.svg",
            "letter_x2-p-checked": "./assets/elements/letter_x2-p-checked.svg",
            "letter_x3": "./assets/elements/letter_x3.svg",
            "letter_x3-p": "./assets/elements/letter_x3-p.svg",
            "letter_x3-checked": "./assets/elements/letter_x3-checked.svg",
            "letter_x3-p-checked": "./assets/elements/letter_x3-p-checked.svg",
            "word_x2": "./assets/elements/word_x2.svg",
            "word_x2-p": "./assets/elements/word_x2-p.svg",
            "word_x2-checked": "./assets/elements/word_x2-checked.svg",
            "word_x2-p-checked": "./assets/elements/word_x2-p-checked.svg",
            "word_x3": "./assets/elements/word_x3.svg",
            "word_x3-p": "./assets/elements/word_x3-p.svg",
            "word_x3-checked": "./assets/elements/word_x3-checked.svg",
            "word_x3-p-checked": "./assets/elements/word_x3-p-checked.svg",
            "star": "./assets/elements/star.svg",
            "star-p": "./assets/elements/star-p.svg",
            "star-checked": "./assets/elements/star-checked.svg",
            "star-p-checked": "./assets/elements/star-p-checked.svg",

            "key": "./assets/elements/key_blank.png",
            "key-p": "./assets/elements/key_blank-p.png",
            "backspace": "./assets/elements/backspace.svg",
            "backspace-p": "./assets/elements/backspace-p.svg",

            "timer_case-move": "./assets/elements/timer_case.svg",
            "timer_case-move-p": "./assets/elements/timer_case-p.svg",
            "timer_case-game": "./assets/elements/timer_case-game.svg",
            "timer_case-game-p": "./assets/elements/timer_case-game-p.svg",

            "move_info_board": "./assets/move_info_board.svg",

            "icon-play": "./assets/icons/play.svg",
            "icon-pause": "./assets/icons/pause.svg",
            "icon-reset": "./assets/icons/reset.svg",
            "icon-pencil": "./assets/icons/pencil.svg",
            "icon-three_dots": "./assets/icons/three_dots.svg",
            "icon-back": "./assets/icons/back.svg",
            "icon-left": "./assets/icons/left.svg",
            "icon-right": "./assets/icons/right.svg",

            "button-mask-1": "./assets/masks/button-1.png",
            "button-mask-2": "./assets/masks/button-2.png",
            "button-mask-3": "./assets/masks/button-3.png",
        },
        subcanvasImagesBlacklist: [
            "title",
            "button-mask-1", "button-mask-2", "button-mask-3"
        ],
        masks: [
            "letter_x2", "letter_x3", "word_x2", "word_x3",
            "checkbox", "backspace",
            "button-mask-1", "button-mask-2", "button-mask-3"
        ],
        files: {
            "wordList": "./assets/russian_words.txt",

            "tmpl-chip-L0": "./assets/chips/letters/а.svg",
            "tmpl-chip-L1": "./assets/chips/letters/б.svg",
            "tmpl-chip-L2": "./assets/chips/letters/в.svg",
            "tmpl-chip-L3": "./assets/chips/letters/г.svg",
            "tmpl-chip-L4": "./assets/chips/letters/д.svg",
            "tmpl-chip-L5": "./assets/chips/letters/е.svg",
            "tmpl-chip-L6": "./assets/chips/letters/ж.svg",
            "tmpl-chip-L7": "./assets/chips/letters/з.svg",
            "tmpl-chip-L8": "./assets/chips/letters/и.svg",
            "tmpl-chip-L9": "./assets/chips/letters/й.svg",
            "tmpl-chip-L10": "./assets/chips/letters/к.svg",
            "tmpl-chip-L11": "./assets/chips/letters/л.svg",
            "tmpl-chip-L12": "./assets/chips/letters/м.svg",
            "tmpl-chip-L13": "./assets/chips/letters/н.svg",
            "tmpl-chip-L14": "./assets/chips/letters/о.svg",
            "tmpl-chip-L15": "./assets/chips/letters/п.svg",
            "tmpl-chip-L16": "./assets/chips/letters/р.svg",
            "tmpl-chip-L17": "./assets/chips/letters/с.svg",
            "tmpl-chip-L18": "./assets/chips/letters/т.svg",
            "tmpl-chip-L19": "./assets/chips/letters/у.svg",
            "tmpl-chip-L20": "./assets/chips/letters/ф.svg",
            "tmpl-chip-L21": "./assets/chips/letters/х.svg",
            "tmpl-chip-L22": "./assets/chips/letters/ц.svg",
            "tmpl-chip-L23": "./assets/chips/letters/ч.svg",
            "tmpl-chip-L24": "./assets/chips/letters/ш.svg",
            "tmpl-chip-L25": "./assets/chips/letters/щ.svg",
            "tmpl-chip-L26": "./assets/chips/letters/ъ.svg",
            "tmpl-chip-L27": "./assets/chips/letters/ы.svg",
            "tmpl-chip-L28": "./assets/chips/letters/ь.svg",
            "tmpl-chip-L29": "./assets/chips/letters/э.svg",
            "tmpl-chip-L30": "./assets/chips/letters/ю.svg",
            "tmpl-chip-L31": "./assets/chips/letters/я.svg",
            "tmpl-chip-N0": "./assets/chips/letter_values/0.svg",
            "tmpl-chip-N1": "./assets/chips/letter_values/1.svg",
            "tmpl-chip-N2": "./assets/chips/letter_values/2.svg",
            "tmpl-chip-N3": "./assets/chips/letter_values/3.svg",
            "tmpl-chip-N4": "./assets/chips/letter_values/4.svg",
            "tmpl-chip-N5": "./assets/chips/letter_values/5.svg",
            "tmpl-chip-N6": "./assets/chips/letter_values/6.svg",
            "tmpl-chip-N7": "./assets/chips/letter_values/7.svg",
            "tmpl-chip-N8": "./assets/chips/letter_values/8.svg",
            "tmpl-chip-N9": "./assets/chips/letter_values/9.svg",
            "tmpl-chip-N10": "./assets/chips/letter_values/10.svg",
            "tmpl-chip-B1": "./assets/chips/chip_basis-1.svg",
            "tmpl-chip-B2": "./assets/chips/chip_basis-2.svg"
        },
        fonts: {
            "Carlito": [
                "./assets/fonts/Carlito-regular.woff2",
                "./assets/fonts/Carlito-cyrillic-regular.woff2",
                "./assets/fonts/Carlito-bold.woff2",
                "./assets/fonts/Carlito-cyrillic-bold.woff2",
                "./assets/fonts/Carlito-italic.woff2",
                "./assets/fonts/Carlito-cyrillic-italic.woff2",
                "./assets/fonts/Carlito-bold_italic.woff2",
                "./assets/fonts/Carlito-cyrillic-bold_italic.woff2"
            ]
        },
        audio: {
            "tick": "./assets/sounds/tick.wav",
            "bell": "./assets/sounds/bell.wav",
            "confirm_move": "./assets/sounds/a_elec_guitar.wav",
        }
    };
}