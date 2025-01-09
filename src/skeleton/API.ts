import StateMachine from "./StateMachine";
import Loader from "../loader/Loader";
import {ALIGN} from "../lib/enums";

interface IInterfaceOptions {
    gameAlign: ALIGN
}

export default class API {
    private _stateMachine: StateMachine;
    private _packs: any[];

    public interfaceOptions: IInterfaceOptions

    constructor(sm: StateMachine) {
        this._stateMachine = sm;
        this.interfaceOptions = {
            gameAlign: ALIGN.center
        }
    }

    loadState(name: string) {
        // класс найден и уже подключен - переключаемся на него
        Loader.nextState = name;
        Loader.setAssetsPath(name);
        // и запустим лоадер, чтобы прогрузил его
        this._stateMachine.startState("loader");
    }

    startState(name: string) {
        this._stateMachine.startState(name);
    }

    set packs(value: any) {
        this._packs = value;
    }

    get packs() {
        return this._packs;
    }
}