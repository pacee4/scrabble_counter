// DEFINED MESSAGES
export enum Msg {
    /** Broadcasts when the project has finished loading. */
    START,
    /** Broadcasts on each screen refresh. */
    TICK,
    /** Broadcasts after all messages have been processed and before drawing. */
    TICK_AFTER,

    TICK_CLICK,
    TICK_LOGIC,
    LISTEN_TO_KEYBOARD,
    
    START_GAME,
    END_GAME,

    EXPAND_TIMER,
    STAGE_HELP,
    STAGE_RESERVED,

    UPDATE_LOAD_TABLE_BUTTON,
    UPDATE_TABLE_APPEARANCE,
    UPDATE_MOVE_STATE_BUTTON,
    UPDATE_FINISH_STATE,
    SUBMIT_CLICK_BUTTON,
    UPDATE_TIMER_CONTROL_BUTTONS,

    TICK_CONTEXT_MENU_CLICK,
    UPDATE_MOVE_INFO_NAVIGATION_BUTTONS,
    UPDATE_HELP_NAVIGATION_BUTTONS
}