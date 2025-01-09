import * as PIXI from "pixi.js";
import State from "../skeleton/State";
//import { Howl } from "howler";
//import ErrorState from "../skeleton/ErrorState";
//import Lobby from "../lobby/Lobby";
import Resource = PIXI.LoaderResource;
import Texture = PIXI.Texture;
import LoaderCache from "./LoaderCache";
import utils from "../lib/utils";
// import Crypto from "./Crypto";
// import {createHash} from "crypto";
import StaticCache from "./StaticCache";

/**
 * Загружает все ресурсы из resource_list.json, который должен находиться в директории установленной методом setAssetsPath.
 * В секциях ресурс-листа можно указывать другие ресурс-листы, по-умолчанию будет
 * браться секция default, однако через ":" можно указать любую другую.
 * @example "./path/to/resources/resource_list.json:light"
 * ВАЖНОЕ ПРИМЕЧАНИЕ: инклюд ресурс-листов имеет два ограничения:
 *   1. в ресурс-листе нельзя заинклюдить ресурс-лист, который уже был заинклюден в дереве;
 *   2. во всём дереве не может присутствовать более одной секции некоторого ресурс-листа;
 */
export default class Loader extends State {
    public static assetsAlias: { [key: string]: string; };
    public static nextState: string;
    public static subtype?: string;
    public static assetsPath?: string;

    private started: boolean;
    private _mobile: boolean;
    private loadstage: number;
    public _packs: any[];
    public _textures: Texture[];
    public _spines: any;
    public _particlesData: any;
    public _i18n: any;
    public _audioSprites: any[];//Howl[];

    // данные собираемые из ресурс-листов
    private resolutions: { [subtype: string]: [number, number] } | undefined;
    private listToLoad: string[];
    private i18nPath: string | undefined;

    public static _seriesPreview: string | undefined;

    private static _totalBytesLoaded: number;
    private static _expectedTotalSize: number | undefined;
    private static _filesInProgress: { [key: string]: number };

    private static netErrorTimer: undefined | number;
    private static netErrorTimeOut = 30000;

    private readonly isHTML5Bar = localStorage.getItem("HTML5Bar") !== "0";

    init() {
        this.started = false;
        let seriesPreview = localStorage.getItem("seriesPreview");
        Loader._seriesPreview = seriesPreview ? seriesPreview : undefined;

        // if (isCrypted()) {
        //     const cryptedResource = {
        //         extension: PIXI.ExtensionType.LoadParser,
        //         test: (url: string) => url.endsWith('.bin'),
        //         async load(src: string, r: { data: { osrc: string } }): Promise<any> {
        //             let cry = new Crypto();
        //
        //             return new Promise((resolve, reject) => {
        //                 let xhr = new XMLHttpRequest();
        //                 xhr.open("GET", src, true);
        //                 xhr.responseType = "arraybuffer";
        //                 xhr.onload = function (_event: ProgressEvent) {
        //                     if (this.status !== 200) {
        //                         reject(this);
        //                     } else {
        //                         let view: Uint8Array = new Uint8Array(this.response);
        //
        //                         cry.decrypt(r.data.osrc, view);
        //
        //                         if (r.data.osrc.endsWith(".json")) {
        //                             let fr = cry.makeJson(src, undefined, view);
        //                             fr.onload = function () {
        //                                 this.onload = null;
        //                                 resolve(JSON.parse(this.result));
        //                             }.bind(fr);
        //                         } else if (r.data.osrc.endsWith(".png")) {
        //                             let img = cry.makeImg(src, undefined, view);
        //                             img.addEventListener("load", () => {
        //                                 console.log("img loaded! " + r.data.osrc);
        //                                 resolve(Texture.from(img));
        //                             }, {once: true});
        //                         } else {
        //                             console.warn(src + "\n" + "This data type not support yet. Rollback to original");
        //                             reject(src);
        //                         }
        //                     }
        //                 };
        //                 xhr.onerror = function () {
        //                     reject(this);
        //                 };
        //                 xhr.send();
        //
        //             });
        //         }
        //     };
        //     PIXI.extensions.add(cryptedResource);
        //     const cryptedAtlas = {
        //         extension: PIXI.ExtensionType.LoadParser,
        //         test: (url: string) => url.endsWith('.cpng'),
        //         async load(src: string, _r: object): Promise<any> {
        //             let cry = new Crypto();
        //             const osrc = src.replace('.cpng', '.png')
        //
        //             return new Promise((resolve, reject) => {
        //                 let xhr = new XMLHttpRequest();
        //                 xhr.open("GET", src, true);
        //                 xhr.responseType = "arraybuffer";
        //                 xhr.onload = function (_event: ProgressEvent) {
        //                     if (this.status !== 200) {
        //                         reject(this);
        //                     } else {
        //                         let view: Uint8Array = new Uint8Array(this.response);
        //
        //                         cry.decrypt(osrc, view);
        //
        //                         let img = cry.makeImg(src, undefined, view);
        //                         img.addEventListener("load", () => {
        //                             console.log("img loaded! " + osrc);
        //                             resolve(Texture.from(img));
        //                         }, {once: true});
        //
        //                     }
        //                 };
        //                 xhr.onerror = function () {
        //                     reject(this);
        //                 };
        //                 xhr.send();
        //             });
        //         }
        //     };
        //     PIXI.extensions.add(cryptedAtlas);
        // }
    }

    start(): void {
        Loader._filesInProgress = {};
        if (LoaderCache.isNeedCache()) {
            LoaderCache.preparePath(Loader.assetsPath + "_" + Loader.subtype);
            LoaderCache.clean();
        }

        window.changeResolution(800, 600);

        this._audioSprites = [];
        //Howler.unload();

        PIXI.Assets.reset();

        this._packs = [];
        this._textures = [];
        this._spines = {};
        this._particlesData = {};
        this._i18n = {};
        this._mobile = false;

        this.loadstage = 0;

        // у лобби дефолтное превью
        if (Loader.nextState === "Lobby") {
            Loader.seriesPreview = undefined;
        }

        // обновим превью
        Loader.updateSeriesPreview();

        // покажем HTML5 зазрузку
        Loader.showProgressBar(true);

        this.started = true;

        // загрузим все необходимые ресурсы
        this.loadResourceList(Loader.assetsPath + "resource_list.json", Loader.subtype)
            .then(() => this.onAssetsLoaded1());
    }

    /**
     * Рекурсивно загружает ресурс-лист и все содержащиеся в нём ресурс-листы.
     * Формирует из всех ресурс-листов список ресурсов для загрузки (listToLoad), записывает их размер (из size),
     * а также записывает параметры из ресурс-листа (только из корневого).
     * В корневом ресурс-листе может содержаться путь до файла интернационализации (i18n.json),
     * а также некоторая дополнительная информация (resolutions, xp_supported, ...).
     */
    loadResourceList(path: string, subtype?: string, root = true): Promise<void> {
        console.warn(path, subtype, root);
        return new Promise<void>((resolve) => {
            let osrc;
            let src: string;
            if (isCrypted()) {
                osrc = path;
                src = "./content/" + makeNameHash(path) + ".bin";
            } else {
                src = path;
            }
            PIXI.Assets.load({src, data: {osrc}}).then((resource_list) => {
                console.warn(resource_list);
                if (!resource_list) {
                    this.error("resource list not found");
                    return;
                }

                // корневой ресурс-лист может содержать i18n и некоторую дополнительную информацию
                if (root) {
                    // сразу сбросим список загрузки (будем его заполнять с нуля)
                    this.listToLoad = [];

                    // если разрешения указаны - запомним их
                    this.resolutions = resource_list.resolutions ? resource_list.resolutions : undefined;

                    // добавим путь к переводам
                    this.i18nPath = resource_list.i18n ? resource_list.i18n : undefined;

                    // мобильный пак?
                    this._mobile = subtype === undefined && window.mobileAndTabletCheck() && resource_list.mobile;

                    // определение подтипа для корневого ресурс-листа
                    if (subtype === undefined) {
                        subtype = this._mobile ? "mobile" : "default";
                    }
                }

                // если не смогли определить подтип - загрузим дефолт
                if (subtype === undefined || resource_list[subtype] === undefined) {
                    subtype = "default";
                }

                // только для html бара смотрим размер
                if (this.isHTML5Bar && isCrypted()) {
                    // получим размер пака игры из ресурс-листа
                    // если значения size нет - получим undefined, что нам и нужно
                    let size;
                    if (resource_list.size !== undefined) {
                        // если size не число, значит объект из которого получим размеры
                        if (isNaN(resource_list.size)) {
                            if (this._mobile && resource_list.size.mobile !== undefined) {
                                size = resource_list.size.mobile;
                            } else {
                                size = resource_list.size[subtype];
                            }
                        } else {
                            size = resource_list.size;
                        }
                    }
                    if (size) {
                        if (Loader._expectedTotalSize === undefined) Loader._expectedTotalSize = 0;
                        Loader._expectedTotalSize += size;
                    }
                }

                let promise = Promise.resolve();
                resource_list[subtype].forEach((item: string) => {
                    // если итем - ресурс-лист, то его тоже нужно загрузить
                    if (item.includes("resource_list.json")) {
                        let pathAndSubtype = item.split(":");
                        promise = promise.then(() => this.loadResourceList(pathAndSubtype[0], pathAndSubtype[1], false));
                    } else {
                        this.listToLoad.push(item);
                    }
                });
                promise.then(resolve);
            });
        });
    }

    /**
     * загружена первая часть (заголовки)
     */
    onAssetsLoaded1() {
        Loader.showProgressBar(true);
        this.loadstage = 1;
        this.loadMainAssets().then(() => {
            this.onAssetsLoaded2();
        });
    }

    /**
     * Загрузка основных ресурсов из заранее собранного списка (listToLoad), а также
     * загрузка файла интернационализации (если сохранён путь к нему в i18nPath).
     */
    async loadMainAssets() {
        // сбросим предыдущие данные загрузки
        PIXI.Assets.reset();

        // запускаем загрузки
        this.started = true;
        Loader._totalBytesLoaded = 0;

        // добавим переводы к загрузке если есть
        if (this.i18nPath) {
            this._i18n = await PIXI.Assets.load(this.i18nPath);
        }

        for (let i = 0; i < this.listToLoad.length; i++) {
            const item: string = this.listToLoad[i];
            let osrc;
            let src: string;
            if (isCrypted()) {
                osrc = item;
                src = "./content/" + makeNameHash(item) + ".bin";
            } else {
                src = item;
            }

            // все json файлы грузим как внешние ресурсы, в дальнейшем их разберем детально
            if (item.endsWith(".json")) {
                if (item.includes("/spine/")) {
                    let s = item.split("/").reverse();
                    let fname = s[0];
                    let atlname = fname.split(".")[0];
                    PIXI.Assets.add(atlname, {src, osrc});
                } else if (item.endsWith('pack.json')) {
                    const pack = await PIXI.Assets.load({src, data: {osrc}});
                    this._packs.push(pack);
                } else {
                    await PIXI.Assets.load({src: item});
                }
            }
        }
    }

    /**
     * загружена вторая часть (основная)
     */
    onAssetsLoaded2() {
        this.netErrorTimerStart(false);
        this.started = false;
        console.log("LOADED");

        Loader._expectedTotalSize = undefined;
        Loader.showProgressBar(false);

        // определим разрешение для нового стейта
        let w = 800;
        let h = 600;

        let r;

        // выберем разрешение из ресурс листа

        if (Loader.subtype !== undefined) {
            if (this.resolutions) {
                r = this.resolutions[Loader.subtype];
                if (r) {
                    w = r[0];
                    h = r[1];
                }
            }
        } else if (this._mobile) {
            // дефолтное разрешение для мобильных игр
            w = 853;
            h = 480;
            if (this.resolutions) {
                r = this.resolutions["mobile"];
                if (r) {
                    w = r[0];
                    h = r[1];
                }
            }
        } else {
            if (this.resolutions) {
                r = this.resolutions["default"];
                if (r) {
                    w = r[0];
                    h = r[1];
                }
            }
        }

        this._packs.sort((a: any, b: any) => {
            let ai = this.listToLoad.indexOf(a.url);
            let bi = this.listToLoad.indexOf(b.url);
            return ai - bi;
        });
        // console.log(this._packs.map((p) => {
        //     return p.url;
        // }));
        window.isMobile = this._mobile;
        window.changeResolution(w, h);

        // запустим основной стейт для которого все грузили
        console.warn("READY TO START", this);
        window.api.packs = this._packs;
        window.api.startState(Loader.nextState);
    }

    error(_msg: string) {
        this.started = false;

        // уничтожим контролы
        Loader.showProgressBar(false);

        //ErrorState.errorText = msg;
        //net.toggleSceneState("ErrorState");
    }

    /**
     * Обработка процесса загрузки загрузчиком PIXI
     *
     * @param v
     */
    onProgressCallback(v: PIXI.Loader) {
        if (this.loadstage === 1 && this.started && !Loader._expectedTotalSize) {
            Loader.progressBarVisualUpdate(v.progress / 100);
        }
    }

    /**
     * Обработка процесса загрузки с использованием шифрованных паков
     */
    static progressBarUpdate(): void {
        let bytes = 0;
        if (Loader._totalBytesLoaded && Loader._expectedTotalSize) {
            bytes = Loader._totalBytesLoaded ? Loader._totalBytesLoaded : 0;
            for (let f in Loader._filesInProgress) {
                bytes += Loader._filesInProgress[f];
            }
            Loader.progressBarVisualUpdate(bytes / Loader._expectedTotalSize, bytes);
        }
    }

    /**
     * Визуальное отображение процесса загрузки
     * @param loadedPercent
     * @param bytes
     */
    static progressBarVisualUpdate(loadedPercent: number, bytes?: number): void {
        // ни при каком условии не показываем в прогрессбаре больше 100%
        if (loadedPercent > 1) {
            // console.warn(loadedPercent);
            loadedPercent = 1;
        }

        let html5bar = window.document.getElementById("progress-bar-inner");
        if (html5bar) {
            html5bar.style.width = loadedPercent * 100 + "%";
            let percentLb = window.document.getElementById("percentLoaded");
            let dataLb = window.document.getElementById("dataLoaded");
            if (dataLb !== null) {
                if (bytes === undefined) {
                    dataLb.style.display = "none";
                } else {
                    dataLb.style.display = "block";
                    dataLb.innerText = Loader._expectedTotalSize ? formatBytes(bytes) + " / " + formatBytes(Loader._expectedTotalSize) : " ";
                }
            }
            if (percentLb !== null) {
                percentLb.innerText = "Loading " + (Math.round(loadedPercent * 100)) + " %";
            }
        }
    }

    static showProgressBar(show = true): void {
        let bar = window.document.getElementById("progress-bar-container");
        if (bar) {
            bar.style.display = show ? "block" : "none";
        }
        let gameCont = window.document.getElementById("gameDiv");
        if (gameCont) {
            gameCont.style.display = show ? "none" : "block";
        }
        this.progressBarVisualUpdate(0, 0);
    }

    static setAssetsPath(path: string) {
        // перед каждой загрузкой обязательно обнулим подтип
        Loader.subtype = undefined;
        if (Loader.assetsAlias) {
            let a = Loader.assetsAlias[path];
            if (a) {
                path = a;
            }
        }
        Loader.assetsPath = "./assets/" + path + "/";
    }

    static updateSeriesPreview() {
        let previewImg = <HTMLImageElement>document.getElementById("loader-img");
        if (previewImg) {
            previewImg.src = "";
            if (Loader.seriesPreview === undefined) {
                previewImg.src = "./assets/static/loader-logo.svg";
            } else {
                let previewSrc = "./assets/static/banners/banner_" + Loader.seriesPreview + ".png";
                let dataUrl = StaticCache.getDataSrc(previewSrc);
                if (dataUrl) {
                    previewImg.src = dataUrl;
                } else {
                    StaticCache.loadSrc(previewSrc)
                        .then((data) => previewImg.src = data);
                }
            }
        }
    }

    static get seriesPreview(): string | undefined {
        return Loader._seriesPreview;
    }

    static set seriesPreview(value: string | undefined) {
        console.warn("setSeriesPreview", value);
        Loader._seriesPreview = value;
        if (value) {
            localStorage.setItem("seriesPreview", value);
        } else {
            localStorage.removeItem("seriesPreview");
        }

    }

    /**
     * Запуск и остановка таймера лимитирующего количество попыток соединения
     * @param start
     */
    netErrorTimerStart(start = true) {
        // если сети нет и таймер не запущен
        if (start && Loader.netErrorTimer === undefined) {
            Loader.netErrorTimer = window.setTimeout(() => {
                //Howler.unload();
                this.init();
                this.netErrorTimerStart(false);
                this.error("Failed to download resource");
            }, Loader.netErrorTimeOut);
        }
        // если сеть появилась
        if (!start) {
            clearTimeout(Loader.netErrorTimer);
            Loader.netErrorTimer = undefined;
        }
    }
}

export function isCrypted(): boolean {
    return false;
}

function formatBytes(n: number): string {
    return utils.numberFormatMeasure(n, [0, 0, 1], 1024, [" B", " KB", " MB"]);
}

export function makeNameHash(name: string): string {
    return createHash("sha256")
        .update(name.substr(name.indexOf("assets/")))
        .digest("hex");
}
