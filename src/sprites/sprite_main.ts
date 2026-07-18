import * as F from "@/core/functions";
import * as C from "@/editable/custom";
import { m } from "@/core/sensing_properties";
import { g } from "@/editable/global_properties";

import { Sprite } from "@/core/base_classes";
import { soundManager } from "@/core/sound_manager";
import { AnimationSequence } from "@/editable/custom";
import { Msg } from "@/editable/msg";
import { settings } from "@/editable/settings";

import { s } from "./storage";


export class Main extends Sprite {
    constructor() {
        super();
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.START:
                break;

            case Msg.TICK:
                break;
        }
    }
}
