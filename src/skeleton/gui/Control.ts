import * as PIXI from "pixi.js";
import Scene from "../Scene";
import Container from "./Container";

type DestroyParams = { children?: boolean };
export default class Control {
    public ox: number;
    public oy: number;
    public z: number;

    public pickCallback: Callback | undefined;
    public dropCallback: Callback | undefined;
    public dragCallback: Callback | undefined;
    public startXY: number[];

    protected _displayObject: PIXIElement;

    protected _scene: Scene;

    private _createOrder: number;
    private _nickname: string;
    private _parent: Container;

    constructor(data: PackItemParams, order: number, scene: Scene, displayObject?: PIXI.DisplayObject) {
        this._displayObject = displayObject || new PIXI.Sprite(PIXI.Texture.EMPTY);
        this._scene = scene;
        this.x = this.ox = data.x || 0;
        this.y = this.oy = data.y || 0;
        this.alpha = data.alpha || 1;
        this.rotation = data.rotation || 0;
        this.scale = {x: data.scalex || 1, y: data.scaley || 1};
        this.nickname = data.nickname;
        this.createOrder = order;
    }

    get x(): number {
        return this._displayObject.x;
    }

    set x(value: number) {
        this._displayObject.x = value;
    }

    get y(): number {
        return this._displayObject.y;
    }

    set y(value: number) {
        this._displayObject.y = value;
    }

    set scale(value: Point) {
        this._displayObject.scale.set(value.x, value.y);
    }

    get scale(): Point {
        return {x: this._displayObject.scale.x, y: this._displayObject.scale.y}
    }

    get alpha(): number {
        return this._displayObject.alpha;
    }

    set alpha(value: number) {
        this._displayObject.alpha = value;
    }

    get rotation(): number {
        return this._displayObject.rotation;
    }

    set rotation(value: number) {
        this._displayObject.rotation = value;
    }

    get visible(): boolean {
        return this._displayObject.visible;
    }

    set visible(value: boolean) {
        this._displayObject.visible = value;
    }

    get interactive(): boolean {
        return this._displayObject.isInteractive();
    }

    set interactive(value: boolean) {
        // 'none': Ignores all interaction events, even on its children.
        // 'passive': Does not emit events and ignores all hit testing on itself and non-interactive children.
        // Interactive children will still emit events.
        // 'auto': Does not emit events and but is hit tested if parent is interactive.
        // Same as interactive = false in v7
        // 'static': Emit events and is hit tested. Same as interaction = true in v7
        // 'dynamic': Emits events and is hit tested but will also receive mock interaction events fired from a ticker
        // to allow for interaction when the mouse isn't moving
        this._displayObject.eventMode = value ? 'static' : 'auto'
    }

    get buttonMode(): boolean {
        return this._displayObject.cursor === 'pointer';
    }

    set buttonMode(value: boolean) {
        this._displayObject.cursor = value ? 'pointer' : 'default';
    }

    get createOrder(): number {
        return this._createOrder;
    }

    set createOrder(value: number) {
        this._createOrder = value;
    }

    get nickname(): string {
        return this._nickname;
    }

    set nickname(value: string) {
        if (value !== Scene.ROOT_CONTAINER && !!this.parent) {
            this._scene.controls[this.parent.nickname][value] = this;
            delete this._scene.controls[this.parent.nickname][this._nickname];
        }
        this._nickname = value;
    }

    restorePos(): void {
        this.x = this.ox;
        this.y = this.oy;
    }

    get pixiElement(): PIXIElement {
        return this._displayObject;
    }

    set mask(mask: PIXI.Graphics | null) {
        if (this.pixiElement !== undefined) {
            this.pixiElement.mask = mask;
        }
    }

    get mask(): PIXI.Graphics | null {
        if (this.pixiElement !== undefined) {
            // PIXI 5
            // At the moment, PIXI.CanvasRenderer doesn't support PIXI.Sprite as mask.
            return <PIXI.Graphics | null>this.pixiElement.mask;
        }
        return null;
    }

    /*clone(copyParams = false, cloneControl: Control): Control {
        // todo
        // генерим свободный ник для контрола на основе никнейма оригинала
        let i = 1;
        let n = this.nickname + "_clone" + i;
        while (cloneControl.scene.controls[n]) {
            i++;
            n = this.nickname + "_clone" + i;
        }
        cloneControl.nickname = n;
        this._scene.controls[this.parent.nickname][n] = cloneControl;
        cloneControl.setParent(this.sprite.parent);
        return cloneControl;
    }*/

    update(_delta?: number): void {
    }

    destroy(destroyParams?: DestroyParams): void {
        delete this._scene.controls[this.parent.nickname][this._nickname];
        this._displayObject.destroy(destroyParams);
    }

    get parent(): Container {
        return this._parent;
    }

    set parent(value: Container) {
        this._parent = value;
        value.pixiElement.addChild(this._displayObject);
    }

    toJSON() {
        const data: {[key:string]:string|number|boolean|object|[]} = {
            nickname: this.nickname,
            visible: this.visible
        }
        if (this.x) {
            data['x'] = this.x;
        }
        if (this.y) {
            data['y'] = this.y;
        }
        if (this.rotation) {
            data['rotation'] = this.rotation;
        }
        if (this.alpha !== 1) {
            data['alpha'] = this.alpha;
        }
        if (this.scale.x !== 1) {
            data['scalex'] = this.scale.x;
        }
        if (this.scale.y !== 1) {
            data['scaley'] = this.scale.y;
        }
        return {
            type: 'control',
            data
        };
    }
}