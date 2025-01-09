import * as PIXI from "pixi.js";
import GameState from "./GameState";

export default class State {
    protected stage: PIXI.Container;
    private _gameState: GameState;

    constructor(stage: PIXI.Container) {
        this.stage = stage;
        this.init();
    }

    assignLoader(): void {
    }

    init(): void {
    }

    start(): void {
    }

    set gameState(state: GameState) {
        if (state === undefined) {
            throw Error('setting undefined state');
        }

        let oldStateName: string | undefined;

        if (this._gameState !== undefined) {
            oldStateName = this._gameState.name();
            this._gameState.end();
        }

        this._gameState = state;

        if (oldStateName) {
            console.log(`${oldStateName} ==> ${this._gameState.name()}`);
        } else {
            console.log(`===> ${this._gameState.name()}`);
        }

        this._gameState.start();
    }

    get gameState(): GameState {
        return this._gameState;
    }

    end(): void {
    }

    update(_delta: number) {
    }

    dispose() {
    }
}