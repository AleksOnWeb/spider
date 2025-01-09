import Picture from "../Picture";
import Scene from "../../Scene";

export default class Card extends Picture {
    private _suit: string;
    private _value: number;
    private _open: boolean;

    public stack: any; //any object/array/identifier for mark the card owner

    public static deckMap: { [key: string]: PIXI.Texture };
    public static mapLegend = (suit: string, value: number, open: boolean) => !open ? "back" : value === 0 ? "blank" : (suit + value);

    constructor(data: PackItemParams, order: number, scene: Scene, displayObject?: PIXIElement) {
        super(data, order, scene, displayObject);
        this._suit = "";
        this._value = 0;
        this._open = true;
    }

    setCard(suit: string, value: number, open?: boolean) {
        this._suit = suit;
        this._value = value;
        if (open !== undefined) this._open = open;
        (<PIXI.Sprite>this.pixiElement).texture = Card.deckMap[Card.mapLegend(this._suit, this._value, this._open)];
    }

    get suit(): string {
        return this._suit;
    }

    set suit(s: string) {
        if (this._suit !== s) {
            this.setCard(s, this._value);
        }
    }

    get value(): number {
        return this._value;
    }

    set value(v: number) {
        if (this._value !== v) {
            this.setCard(this._suit, v);
        }
    }

    get open(): boolean {
        return this._open;
    }

    set open(o: boolean) {
        if (this._open !== o) {
            this.setCard(this._suit, this._value, o);
        }
    }
}