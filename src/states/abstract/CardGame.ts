import Scene from "../../skeleton/Scene";
import Card from "../../skeleton/gui/custom/Card";
import Container from "../../skeleton/gui/Container";

export default class CardGame extends Scene {
    start(): void {
        super.start();
        this.initDeck();
        this.makeCards();
    }

    initDeck(): void {
        // create deck map and custom legend if need
        let map:{ [key: string]: PIXI.Texture } = {};
        ["d", "h", "c", "s"].forEach(suit => {
            for (let i = 1; i <= 13; i++) {
                map[suit + i] = <PIXI.Texture>this.findTexture(suit + "_" + i);
            }
        });
        map["back"]=<PIXI.Texture>this.findTexture("card_back");
        map["blank"]=<PIXI.Texture>this.findTexture("card_blank");
        Card.deckMap = map;
        //Card.mapLegend = ()=>{};
    }

    makeCards(): void {
        // make and place cards on their positions
    }

    getCardContainer():Container{
        return this.getRootContainer();
    }
}