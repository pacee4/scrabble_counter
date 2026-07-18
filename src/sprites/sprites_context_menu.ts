import * as F from "@/core/functions";
import * as C from "@/editable/custom";
import { CtxToolkit } from "@/editable/custom";
import { m, messages, sf, sfR } from "@/core/sensing_properties";
import { g } from "@/editable/global_properties";

import { ACompCollidable, CompHitbox, CompMask, Sprite, type Ctx2D } from "@/core/base_classes";
import { Msg } from "@/editable/msg";
import { settings } from "@/editable/settings";

import { s } from "./storage";
import { gatheredAssets } from "@/core/asset_loader";
import { SAButton, SCheckboxes, subFillButton } from "./sprites_buttons";



const BOX_THICKNESS = 3;
const ITEM_HEIGHT = 26;

export class SContextMenuBoxWithHeader extends Sprite {
    subBox;
    subHeader;
    path;

    constructor(width: number, height: number, header: string) {
        const HEADER_HEIGHT = 22;

        super(0, 0);
        this.width = width + BOX_THICKNESS*2;
        this.height = height + BOX_THICKNESS + HEADER_HEIGHT;
        this.setAnchorPoint(1, 1);

        this.path = CtxToolkit.defineRoundedRect(0, 0, this.width, this.height, 6);
        this.subBox = new C.AutoSubcanvas(this, this.width, this.height, (sctx)=>{
            sctx.fillStyle = "#666666";
            sctx.fill(this.path);
        });
        
        this.subHeader = new C.AutoSubcanvas(this, this.width, HEADER_HEIGHT, (sctx)=>{
            sctx.font = `bold 12pt ${g.FONT_STACK}`;
            sctx.textAlign = "center";
            sctx.textBaseline = "middle";

            sctx.fillStyle = "white";
            sctx.fillText(header, width/2, HEADER_HEIGHT/2 + 1);
        });
    }

    messageStep(message: Msg): void {
        switch (message) {
            case Msg.TICK_AFTER:
                this.subBox.update();
                this.subHeader.update();
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        this.subBox.display(ctx);
        this.subHeader.display(ctx);
    }
}


interface MenuItemCheckboxProperties {
    type: "checkbox",
    label: string,
    objectReference: {[index: number|string]: any},
    property: number|string,
    checkAction?: (state: boolean)=>void
}
interface MenuItemButtonProperties {
    type: "button",
    label: string,
    backgroundColor?: string,
    /** Arrow function */
    clickAction: ()=>void,

    disabled?: boolean
}


abstract class SAMenuItem extends SAButton {
    clickHitbox!: ACompCollidable;
    click!: C.CompClickable<this>;
    
    clickMsg = Msg.TICK_CONTEXT_MENU_CLICK;

    constructor(y: number, boxContentWidth: number, clickAction: ()=>void) {
        super(0, y);

        this.width = boxContentWidth;
        this.height = ITEM_HEIGHT-1;
        this.setAnchorPoint(1, 0);
        this.absoluteAnchor.x += BOX_THICKNESS;

        // Hitbox and click
        this.clickHitbox = new CompHitbox(this);
        this.click = new C.CompClickable(this, this.clickHitbox, clickAction);
    }
}


class SMenuItemButton extends SAMenuItem {
    subFill;
    subLabel;

    path: Path2D;

    backgroundColor;

    constructor(y: number, boxContentWidth: number, p: MenuItemButtonProperties) {
        super(y, boxContentWidth, p.clickAction);
        this.backgroundColor = p.backgroundColor ?? g.COLOR_PALETTE.lightGray;

        if (p.disabled) {
            this.disabled = p.disabled;
        }

        this.path = new Path2D();
        this.path.rect(0, 0, this.width, this.height);

        // Sub-canvases
        this.subFill = subFillButton(this, this.width, this.height, this.path);
        this.subLabel = new C.AutoSubcanvas(this, this.width, this.height, (sctx)=>{
            sctx.font = `12pt ${g.FONT_STACK}`;
            sctx.textBaseline = "middle";
            sctx.fillStyle = "black";
            sctx.fillText(p.label, 6, this.height/2 + 1);
        });
    }

    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.TICK_AFTER:
                this.subFill.update((this.disabled ? g.COLOR_PALETTE.disabled : this.backgroundColor), this.click.focused);
                this.subLabel.update();
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        this.subFill.display(ctx);
        this.subLabel.display(ctx);
    }
}

class SMenuItemCheckbox extends SAMenuItem {
    path; subFill; subLabel;
    checked: boolean;

    checkboxImgKey = "checkbox";

    constructor(y: number, boxContentWidth: number, p: MenuItemCheckboxProperties) {
        super(y, boxContentWidth, ()=>{
            this.checked = !this.checked;
            p.objectReference[p.property] = this.checked;
            p.checkAction?.(this.checked);
        });
        this.checked = p.objectReference[p.property]; // recover state

        this.width = boxContentWidth;
        this.height = ITEM_HEIGHT-1;

        this.path = new Path2D();
        this.path.rect(0, 0, this.width, this.height);

        // Sub-canvases
        this.subFill = subFillButton(this, this.width, this.height, this.path);
        this.subLabel = new C.AutoSubcanvas(this, this.width-26, this.height, (sctx)=>{
            sctx.font = `12pt ${g.FONT_STACK}`;
            sctx.textBaseline = "middle";
            sctx.fillStyle = "white";
            sctx.fillText(p.label, 6, this.height/2 + 1);
        });
    }
    
    messageStep(message: Msg): void {
        super.messageStep(message);

        switch (message) {
            case Msg.TICK_AFTER:
                this.subFill.update(g.COLOR_PALETTE.transBlack, this.click.focused);
                this.subLabel.update();
                this.checkboxImgKey = "checkbox" + (this.click.focused?"-p":"") + (this.checked?"-checked":"");
                break;
        }
    }

    drawResult(ctx: Ctx2D): void {
        const savedTransform = ctx.getTransform();

        this.subFill.display(ctx);

        // checkbox image
        ctx.translate(sfR(3), sfR(1.5));
        ctx.scale(0.45, 0.45);
        ctx.drawImage(gatheredAssets.subcanvasImages[this.checkboxImgKey].v, 0, 0);
        
        ctx.setTransform(savedTransform);
        // label
        ctx.translate(sfR(26), 0);
        this.subLabel.display(ctx);
    }
}



export function createMenuItemSprites(p: {
    header: string,
    content: (MenuItemCheckboxProperties|MenuItemButtonProperties)[]
}) {
    // the height of each item is 29
    const itemsHeight = (p.content.length * ITEM_HEIGHT) - 1;
    const width = 188;
    
    const s_boxWithHeader = new SContextMenuBoxWithHeader(width, itemsHeight, p.header);

    const sprites: Sprite[] = [s_boxWithHeader];
    
    let y = -itemsHeight - BOX_THICKNESS;
    p.content.forEach((item)=>{
        if (item.type === "button") {
            sprites.push(new SMenuItemButton(y, width, item));
        }
        else if (item.type === "checkbox") {
            sprites.push(new SMenuItemCheckbox(y, width, item));
        }
        y += ITEM_HEIGHT;
    });

    return sprites;
}