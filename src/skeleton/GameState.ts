import State from "./State";

export default class GameState {
    protected game: State;

    constructor(game: State) {
        this.game = game;
        this.init();
    }

    name(): string {
        return 'GameState';
    }

    init(): void {
    }

    start(): void {
    }

    end(): void {
    }

    update(_delta: number) {
    }
}