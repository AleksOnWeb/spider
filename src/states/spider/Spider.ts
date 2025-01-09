import CardGame from "../abstract/CardGame";
import Card from "../../skeleton/gui/custom/Card";
import Control from "../../skeleton/gui/Control";
import Button from "../../skeleton/gui/Button";
import Container from "../../skeleton/gui/Container";
import Label from "../../skeleton/gui/Label";

export default class Spider extends CardGame {
    private _deck: Card[];
    private _playTable: Card[][];
    private _endStock: Card[];
    private _stock: Card[][];
    private _dragNDropOrderOffset: number;
    private _dragNDropEndZones: Point[][];
    private _cardWidth: number;
    private _cardHeight: number;

    private _difficulty: number;

    init(): void {
        super.init();
        this._dragNDropOrderOffset = 100;
        this._dragNDropEndZones = [];
        for (let i = 0; i < 10; i++) {
            this._dragNDropEndZones[i] = [];
        }
        this._difficulty = parseInt(localStorage.getItem("difficulty") || "0", 10);
    }

    start(): void {
        super.start();

        this._deck = window._.shuffle(this._deck);

        let currentCard = 0;
        this._stock = [];
        for (let stock = 0; stock < 5; stock++) {
            this._stock[stock] = [];
            for (let card = 0; card < 10; card++) {
                this._stock[stock].push(this._deck[currentCard++]);
            }
        }

        this._playTable = [];
        for (let i = 0; i < 10; i++) {
            this._playTable[i] = [];
        }

        let i = 0;
        for (let card = currentCard; card < this._deck.length; card++) {
            this._playTable[i].push(this._deck[card]);
            i++;
            if (i >= 10) i = 0;
        }

        this._endStock = [];

        this._cardWidth = this._playTable[0][0].width;
        this._cardHeight = this._playTable[0][0].height;

        this.getStocksCoords().forEach((coord, i) => {
            let card = new Card({nickname: "empty" + i}, 1, this);
            card.parent = <Container>this.getControl("game");
            this.controls[card.parent.nickname][card.nickname] = card;
            card.visible = true;
            card.x = coord.x;
            card.y = coord.y;
            card.setCard("", 0, false);
            card.open = true;
            card.tint = 0x125D50;
        });

        let btn = <Button>this.getControl("button_new_row", "game");
        btn.height = this._cardHeight;
        btn.width = this._cardWidth;

        this.updateStocks([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

        this.processTurn();
        this.fpsText = this.getControl("fps_text") as Label;
    }

    makeCards(): void {
        super.makeCards();
        this._deck = [];
        //make cards {suit}_{value}_{n}
        for (let n = 0; n < this.getConfig().n; n++) {
            this.getConfig().suits.forEach(suit => {
                for (let value = 1; value <= 13; value++) {
                    this.makeCard(suit + "_" + value + "_" + n, suit, value);
                }
            });
        }
    }

    changeDifficulty(newDifficulty: number): void {
        this._difficulty = [0, 1, 2].includes(newDifficulty) ? newDifficulty : 0;
        localStorage.setItem("difficulty", "" + this._difficulty);
    }

    getConfig(): { suits: string[], n: number } {
        return [
            {suits: ["s"], n: 8},
            {suits: ["s", "h"], n: 4},
            {suits: ["s", "h", "d", "c"], n: 2}
        ][this._difficulty];
    }

    makeCard(nickname: string, suit: string, value: number): void {
        let card = new Card({nickname: nickname}, 1, this);
        card.parent = <Container>this.getControl("game");
        this.controls[card.parent.nickname][card.nickname] = card;
        card.visible = true;
        card.setCard(suit, value, false);
        this.createDragAndDropFor(card, this.pick.bind(this), this.drop.bind(this), this.drag.bind(this));
        this._deck.push(card);
    }

    pick(card: Card): void {
        for (let i = this._playTable[card.stack].indexOf(card); i < this._playTable[card.stack].length; i++) {
            this._playTable[card.stack][i].createOrder += this._dragNDropOrderOffset;
        }
        this.needResort = true;
    }

    drag(card: Card): void {
        let stack = this._playTable[card.stack].slice(this._playTable[card.stack].indexOf(card));
        for (let i = 1; i < stack.length; i++) {
            stack[i].y = stack[0].y + 30 * i;
            stack[i].x = stack[0].x;
        }
    }

    drop(card: Card): void {
        this.needResort = true;
        let pos = this.checkPosition(card);
        // check drag'n'drop position
        if (pos !== -1 && pos !== card.stack) {
            // check turn for game rules
            if (this._playTable[pos].length === 0 || card.value + 1 === this._playTable[pos][this._playTable[pos].length - 1].value) {
                let from = this._playTable[card.stack];
                this._playTable[pos].push(...from.splice(from.indexOf(card)));
                this.updateStocks([pos, card.stack]);
                this.processTurn();
                return;
            }
        }
        this._playTable[card.stack].slice(this._playTable[card.stack].indexOf(card)).forEach(c => {
            c.restorePos();
            c.createOrder -= this._dragNDropOrderOffset;
        });
    }

    updateStocks(stocks: number[]): void {
        stocks.forEach(id => {
            if (id < 10) {
                this.updatePlayTableStock(id);
            } else if (id === 10) {
                this.updateStock()
            } else {
                this.updateEndStock()
            }
        });
        this.needResort = true;
    }

    updatePlayTableStock(id: number): void {
        let x = this.getStocksCoords()[id].x;
        let y = this.getStocksCoords()[id].y;
        let createOrder = this.getCreateOrder();
        this._playTable[id].forEach((card, pos, arr) => {
            card.x = card.ox = x;
            let prevPos = pos - 1;
            card.y = card.oy = prevPos < 0 ? y : arr[prevPos].y + (arr[prevPos].open ? 30 : 10);
            card.createOrder = createOrder++;
            card.stack = id;
        });

        this._dragNDropEndZones[id] = [];
        this._dragNDropEndZones[id].push({
            x: x - this._cardWidth / 2,
            y: (this._playTable[id].length === 0 ? y : this._playTable[id][this._playTable[id].length - 1].y) - this._cardWidth / 2
        });
        this._dragNDropEndZones[id].push({
            x: this._dragNDropEndZones[id][0].x + this._cardWidth,
            y: this._dragNDropEndZones[id][0].y + this._cardHeight
        });
    }

    updateStock(): void {
        let x = this.getStocksCoords()[10].x;
        let y = this.getStocksCoords()[10].y;
        let createOrder = this.getCreateOrder();
        this._stock.forEach((stock, stockId) => stock.forEach(card => {
            card.x = card.ox = x - stockId * 20;
            card.y = card.oy = y;
            card.createOrder = createOrder++;
        }));
        if (this._stock.length > 0) {
            let btn = <Button>this.getControl("button_new_row", "game");
            btn.x = this._stock[this._stock.length - 1][0].x;
            btn.y = this._stock[this._stock.length - 1][0].y;
        }
    }

    updateEndStock(): void {
        let x = this.getStocksCoords()[11].x;
        let y = this.getStocksCoords()[11].y;
        let createOrder = this.getCreateOrder();
        this._endStock.forEach(card => {
            card.x = card.ox = x;
            card.y = card.oy = y;
            card.createOrder = createOrder++;
        })
    }

    processTurn(): void {
        for (let i = 0; i < this._playTable.length; i++) {
            this.processCardsAvailability(i);
            // there is only one possible variant where 13-th card from end is interactive.
            // It's stack from Ace to King
            if (this._playTable[i].length >= 13 && this._playTable[i][this._playTable[i].length - 13].interactive) {
                (<Button>this.getControl("button_new_row", "game")).enabled = false;
                this._playTable.forEach(table => table.forEach(card => card.interactive = false));
                this.moveCardsToEndStock(i).then(() => {
                    this.processTurn();
                    this.updateEndStock();
                    this.updatePlayTableStock(i);
                    (<Button>this.getControl("button_new_row", "game")).enabled = this._stock.length > 0;
                });
                break;
            }
        }
    }

    async moveCardsToEndStock(playTableId: number): Promise<void> {
        for (let j = 0; j < 13; j++) {
            let card = <Card>this._playTable[playTableId].pop();
            card.createOrder = this._dragNDropOrderOffset * 2 + j;
            this.needResort = true;
            this._endStock.push(card);
            await this.addTween().addControl(card).do({
                x: ["ox", this.getStocksCoords()[11].x],
                y: ["oy", this.getStocksCoords()[11].y]
            }).startPromise(100);
        }
    }

    async moveCardsFromStock(): Promise<void> {
        let cards = <Card[]>this._stock.pop();
        for (let i = 0; i < this._playTable.length; i++) {
            let card = <Card>cards.pop();
            card.createOrder = this._dragNDropOrderOffset * 2 + i;
            card.open = true;
            this.needResort = true;
            await this.addTween().addControl(card).do({
                x: ["ox", this._playTable[i][this._playTable[i].length - 1].x],
                y: ["oy", this._playTable[i][this._playTable[i].length - 1].y + 30]
            }).startPromise(100);
            this._playTable[i].push(card);
        }
    }

    processCardsAvailability(playTableId: number): void {
        if (this._playTable[playTableId].length > 0) {
            // open top-card
            this._playTable[playTableId][this._playTable[playTableId].length - 1].open = true;
            for (let i = this._playTable[playTableId].length - 1; i >= 0; i--) {
                let currCard = this._playTable[playTableId][i];
                if (currCard.open) {
                    let nextCard = this._playTable[playTableId][i + 1];
                    currCard.interactive = (nextCard === undefined) ||
                        currCard.suit === nextCard.suit &&
                        currCard.value === nextCard.value + 1 &&
                        nextCard.interactive;
                    currCard.buttonMode = currCard.interactive;
                } else {
                    break;
                }
            }
        }
    }

    checkPosition(control: Control): number {
        for (let i = 0; i < this._playTable.length; i++) {
            if (this.checkArea({x: control.x, y: control.y}, this._dragNDropEndZones[i])) return i;
        }
        return -1;
    }

    checkArea(point: Point, area: Point[]): boolean {
        return (point.x >= area[0].x && point.x < area[1].x) &&
            (point.y >= area[0].y && point.y < area[1].y)
    }

    getCreateOrder(): number {
        return 3;
    }

    getStocksCoords(): Point[] {
        return [
            {x: 100, y: 150},
            {x: 300, y: 150},
            {x: 500, y: 150},
            {x: 700, y: 150},
            {x: 900, y: 150},
            {x: 1100, y: 150},
            {x: 1300, y: 150},
            {x: 1500, y: 150},
            {x: 1700, y: 150},
            {x: 1900, y: 150},
            {x: 1900, y: 1050},
            {x: 100, y: 1050}
        ]
    }

    onButtonUp(nickname: string): void {
        super.onButtonUp(nickname);
        if (nickname === "button_new_row") {
            for (let i = 0; i < this._playTable.length; i++) {
                if (this._playTable[i].length === 0) return;
            }
            if (this._stock.length > 0) {
                (<Button>this.getControl(nickname, "game")).enabled = false;
                this.moveCardsFromStock().then(() => {
                    this.updateStocks([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
                    this.processTurn();
                    (<Button>this.getControl(nickname, "game")).enabled = this._stock.length > 0;
                });
            }
        }
        if (nickname === "new_game") {
            this.newGame();
        }
        if (nickname === "btn_menu") {
            this.showMenu();
        }
        if (nickname === "btn_menu_close") {
            this.showMenu(false);
        }
        if (nickname === "btn_easy") {
            this.changeDifficulty(0);
            this.newGame();
        }
        if (nickname === "btn_normal") {
            this.changeDifficulty(1);
            this.newGame();
        }
        if (nickname === "btn_hard") {
            this.changeDifficulty(2);
            this.newGame();
        }
    }

    newGame(): void {
        this.dispose();
        this.start();
    }

    showMenu(show = true): void {
        this.getControl("menu").visible = show;
        this.getControl("game").visible = !show;
    }
}