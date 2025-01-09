/**
 * стейт сцены PIXI
 */

import State from "./State";
import Picture from "./gui/Picture";
import * as PIXI from "pixi.js";
import Container from "./gui/Container";
import Button from "./gui/Button";
// import Anim from "./gui/Anim";
import Label from "./gui/Label";
// import IntLabel from "./gui/IntLabel";
import Control from "./gui/Control";
import Tween from "./Tween";

type ControlTypes = "picture" | "container";

export default class Scene extends State {
    static readonly ROOT_CONTAINER = "root";

    public controls: { [containerName: string]: { [name: string]: any } };
    public buttons: { [containerName: string]: { [name: string]: any } };
    public anims: { [containerName: string]: { [name: string]: any } };
    public tweens: Tween[];

    public mousePos: number[];
    public fpsCounter: number;
    public lastFpsTime: number;
    public fps: number;
    public fpsText: Label | undefined;
    public needResort: boolean;

    // Переменная для хранения текущего Drag'n'Drop элемента
    private _dragAndDrop: false | Control;

    private addFunction = {
        picture: this.addPicture,
        button4state: this.addButton4State,
        //checkbutton: this.addCheckButton,
        // anim: this.addAnim,
        // intlabel: this.addIntLabel,
        label: this.addLabel,
        //spine: this.addSpine,
        //particles: this.addParticles,
        //anim_particles: this.addAnimParticles,
        //video: this.addVideo,
        container: this.addContainer
    };

    /**
     * запуск
     */
    start() {
        super.start();
        this.fpsCounter = 0;
        this.lastFpsTime = 0;
        this.controls = {"root": {}};
        this.buttons = {"root": {}};
        this.anims = {"root": {}};
        this.tweens = [];
        this.initRootContainer();
        this.showScene();
    }

    initRootContainer(): void {
        this.controls[Scene.ROOT_CONTAINER][Scene.ROOT_CONTAINER] = new Container({nickname: Scene.ROOT_CONTAINER}, 0, this, this.stage);
    }

    getRootContainer(): Container {
        return <Container>this.controls[Scene.ROOT_CONTAINER][Scene.ROOT_CONTAINER];
    }

    /**
     * показать сцену
     */
    showScene(): void {
        window.api.packs.forEach((pack: { fonts: { [key: string]: any }, scene: PackItem[] }) => {
            let scene: PackItem[] = pack.scene;
            if (scene) {
                this.addItemsToContainer(scene, this.getRootContainer());
                this.needResort = true;
                //this.addFpsText();
            }
        });

        // покажем для сцены интерфейс соответствующий положению экрана
        //this.updateInterface();
    }

    addPicture(data: PackItemParams, order: number, parent?: Container): Picture {
        let picture = new Picture(data, order, this);
        picture.parent = parent || this.getRootContainer();
        this.controls[picture.parent.nickname][data.nickname] = picture;
        return picture;
    }

    // addIntLabel(data: PackItemParams, order: number, parent?: Container): IntLabel {
    //     let intLabel = new IntLabel(data, order, this);
    //     intLabel.parent = parent || this.getRootContainer();
    //     this.controls[intLabel.parent.nickname][intLabel.nickname] = intLabel;
    //     return intLabel;
    // }

    addLabel(data: PackItemParams, order: number, parent?: Container): Label {
        let label = new Label(data, order, this);
        label.parent = parent || this.getRootContainer();
        this.controls[label.parent.nickname][label.nickname] = label;
        return label;
    }

    // addAnim(data: PackItemParams, order: number, parent?: Container): Anim {
    //     let amim = new Anim(data, order, this);
    //     amim.parent = parent || this.getRootContainer();
    //     this.controls[amim.parent.nickname][data.nickname] = amim;
    //     this.anims[amim.parent.nickname][data.nickname] = amim;
    //     return amim;
    // }

    addButton4State(data: PackItemParams, order: number, parent?: Container): Button {
        let button = new Button(data, order, this);
        button.parent = parent || this.getRootContainer();
        this.controls[button.parent.nickname][data.nickname] = button;
        this.buttons[button.parent.nickname][data.nickname] = button;
        return button;
    }

    addContainer(data: PackItemParams, order: number, parent?: Container): Container {
        let container = new Container(data, order, this);
        container.parent = parent || this.getRootContainer();
        if (this.controls[container.nickname] === undefined) {
            // инициализируем все нужные массивы для контролов
            this.controls[container.nickname] = [];
            this.anims[container.nickname] = [];
            //this.spineAnims[container.nickname] = [];
            this.buttons[container.nickname] = [];
            //this.swipes[container.nickname] = [];
            //this.movies[container.nickname] = [];
        } else {
            console.error("Container name duplicate", container.nickname);
        }

        this.controls[data.nickname] = [];
        this.controls[container.parent.nickname][data.nickname] = container;

        if (Array.isArray(data.items)) this.addItemsToContainer(data.items, container);

        return container
    }

    addItemsToContainer(items: PackItem[], container: Container): Container {
        let childCreateOrder = 0;

        items.forEach((item: PackItem) => {
            // убедимся, что контейнер умеет работать с этим типом контролов
            if (Object.keys(this.addFunction).includes(item.type)) {
                // Добавим контрол в контейнер
                let c = this.addFunction[<ControlTypes>item.type].call(this, item.data, childCreateOrder, container);
                if (c !== undefined) {
                    c.visible = item.data.visible; // maybe better move into Control and parent set
                    childCreateOrder++;
                } else {
                    console.error("Broken control", item);
                }
            } else {
                console.error("Unknown control type", item.type, item);
            }
        });
        return container;
    }

    regControl(containerName: string, controlName: string, control: Control) {
        this.controls[containerName][controlName] = control;
    }

    getControl(controlName: string, containerName: string = Scene.ROOT_CONTAINER): Control {
        return this.controls[containerName][controlName];
    }

    /**
     * найти текстуру в паках по ее никнейму
     * @param name
     * @returns {*}
     */
    findTexture(name: string): PIXI.Texture | undefined {
        if (name === "WHITE") {
            return PIXI.Texture.WHITE;
        }
        if (name === "EMPTY") {
            return PIXI.Texture.EMPTY;
        }
        for (let i = 0; i < window.api.packs.length; i++) {
            let p = window.api.packs[i];
            for (let k in p.textures) {
                const texture = p.textures[k];
                if (texture.nickname === name) {
                    //console.log(texture.store);
                    return PIXI.Texture.from(texture.store.toLowerCase());
                }
            }
        }
        return undefined;
    }

    onButtonDown(nickname: string): void {
        console.info("%c press [" + nickname + "]", "background: #222; color: #118D1F");
    }

    onButtonUp(nickname: string): void {
        console.info("%c up [" + nickname + "]", "background: #222; color: #118D1F");
    }

    /**
     * Получить перевод по ключу.
     */

    $t(key: string, params = {}) {
        //TODO
        if (!key) return "";
        // @ts-ignore
        if (!this.i18n) return key;

        let lang = localStorage.getItem("i18n");
        const fallback = "EN";
        lang = lang ? lang : fallback;
        // @ts-ignore
        let locale = this.i18n[lang] ? this.i18n[lang] : null;
        // @ts-ignore
        let localeFallback = this.i18n[fallback] ? this.i18n[fallback] : null;
        let path = key.split(".");
        for (let i = 0; i < path.length; i++) {
            locale = (locale !== null && locale[path[i]]) ? locale[path[i]] : null;
            localeFallback = (localeFallback !== null && localeFallback[path[i]]) ? localeFallback[path[i]] : null;
        }

        let result = null;
        if (locale) {
            result = locale;
        } else if (localeFallback) {
            result = localeFallback;
        }

        if (result !== null) {
            for (let arg in params) {
                // console.error(`arg ind`, `ind=${arg} arg=${params[arg]}`);
                // @ts-ignore
                result = result.replace(new RegExp(`{${arg}}`, "g"), params[arg]);
            }
        }
        return result !== null ? result : key;
    }

    get locale() {
        let lang = localStorage.getItem("i18n");
        return lang ? lang : "EN";
    }

    set locale(val) {
        localStorage.setItem("i18n", val);
    }

    /**
     * Добавлет контролу функционал drag'n'drop.
     * Для активации функционала элемент нужно сделать интерактивным
     * @param target - элемент для которого создаётся drag'n'drop
     * @param pickCallback - действие на начало перетаскивания
     * @param dropCallback - действие на окончание перетаскивания
     * @param dragCallback - действие при смене позиции элемента
     */
    createDragAndDropFor(target: Control, pickCallback?: Callback, dropCallback?: Callback, dragCallback?: Callback): void {
        if (target.interactive) {
            console.error("Do not use on already interactive elements");
            return;
        }

        // на случай если мы захотим поменять функцию
        target.pickCallback = pickCallback;
        target.dropCallback = dropCallback;
        target.dragCallback = dragCallback;

        // начинаем перетаскивание
        let onDragStart = (e: Event) => {
            this._dragAndDrop = target;
            this._dragAndDrop.startXY = this.getEventXY(e);
            if (typeof this._dragAndDrop.pickCallback === "function") {
                this._dragAndDrop.pickCallback(this._dragAndDrop);
            }
        };

        // заканчиваем перетаскивание
        let onDragEnd = () => {
            if (!this._dragAndDrop) return;
            if (typeof this._dragAndDrop.dropCallback === "function") {
                this._dragAndDrop.dropCallback(this._dragAndDrop);
            }
            this._dragAndDrop = false;
        };

        // обновляем координаты элемента, если он интерактивен
        let onDragMove = (e: Event) => {
            // проверим готов ли элемент к перетаскиванию
            if (this._dragAndDrop && (this._dragAndDrop.interactive)) {

                let vector = this.getEventVector(e, this._dragAndDrop.startXY[0], this._dragAndDrop.startXY[1]);

                // если у мобильного эвента нет вектора смещения, запомним текущую точку
                if (vector.isDelta) {
                    this._dragAndDrop.startXY = this.getEventXY(e);
                }

                // обработка перетаскивания
                this._dragAndDrop.x += vector.x;
                this._dragAndDrop.y += vector.y;

                // выполним действие на перетаскивание
                if (typeof this._dragAndDrop.dragCallback === "function") {
                    this._dragAndDrop.dragCallback(this._dragAndDrop);
                }
            }
        };

        let addEvents = (control: Control) => {
            control.pixiElement.on("mousedown", onDragStart)
                .on("touchstart", onDragStart)
                .on("mouseup", onDragEnd)
                .on("mouseupoutside", onDragEnd)
                .on("touchend", onDragEnd)
                .on("touchendoutside", onDragEnd)
                .on("mousemove", onDragMove)
                .on("touchmove", onDragMove);
        };

        addEvents(target);
    }

    /**
     * Получаем координаты клика или тача
     * @param e
     */
    getEventXY(e: Event): number[] {
        // @ts-ignore
        let event = e.data.originalEvent;
        if (window.nativeMobileCheck() || event.pointerType === "touch") {
            // console.log("Mobile");
            // получим координаты касания экрана с учетом ресайза игры
            let kw = window.sceneWidth / window.app.view.clientWidth;
            let kh = window.sceneHeight / window.app.view.clientHeight;
            if (event.changedTouches !== undefined) {
                //console.log("Toches");
                return [
                    event.changedTouches[0].pageX * kw,
                    event.changedTouches[0].pageY * kh
                ];
            } else {
                // console.log("Toches Windows");
                return [
                    event.globalX,
                    event.globalY
                ];
            }
        } else {
            // console.log("Desktop");
            // возьмем координаты мыши из сцены
            return this.mousePos.slice();
        }
    }

    /**
     * Получаем вектор смещения для эвентов перетаскивания
     * Это НЕ ВСЕГДА разница между 2-мя точками
     * Если доступен нативный вектор - то используется он и isDelta ставится true.
     *
     * @param e - InteractionEvent
     * @param startX
     * @param startY
     */
    getEventVector(e: Event, startX: number, startY: number): { x: number, y: number, isDelta: boolean } {
        // Расстояние перетаскивания
        let moveX: number = 0;
        let moveY: number = 0;
        let isDelta: boolean = false;
        // @ts-ignore
        if (window.nativeMobileCheck() || e.pointerType === "touch") {
            // @ts-ignore
            let event = e.data.originalEvent;
            let kw = window.sceneWidth / window.app.view.clientWidth;
            let kh = window.sceneHeight / window.app.view.clientHeight;
            // console.log("Mobile Event", k , event);
            if (event.movementX !== undefined || event.movementY !== undefined) {
                // console.log("PocketBook");
                moveX = event.movementX * kw;
                moveY = event.movementY * kh;
                isDelta = false;
            } else if (event.changedTouches) {
                // console.log("Android");
                moveX = (event.changedTouches[0].pageX - startX / kw) * kw;
                moveY = (event.changedTouches[0].pageY - startY / kh) * kh;
                isDelta = true;
            } else {
                // console.log("iOS");
                moveX = (event.pageX - startX / kw) * kw;
                moveY = (event.pageY - startY / kh) * kh;
                isDelta = true;
            }
        } else {
            moveX = this.mousePos[0] - startX;
            moveY = this.mousePos[1] - startY;
            isDelta = true;
        }
        return {x: moveX, y: moveY, isDelta: isDelta};
    }

    addTween(): Tween {
        let tween = new Tween(this);
        this.tweens.push(tween);
        return tween;
    }

    /**
     * Запуск update на каждом элементе дерева
     * @param list - дерево (anims, spineAnims...)
     * @param delta
     */
    private static updateControlsList(list: { [containerName: string]: { [name: string]: { update: Callback } } }, delta: number): void {
        for (let c in list) {
            for (let name in list[c]) {
                list[c][name].update(delta);
            }
        }
    }

    update(delta: number): void {
        // обновим координаты мыши
        let p = window.renderer.events.pointer.global;
        this.mousePos = [Math.round(p.x), Math.round(p.y)];
        super.update(delta);
        const time = Date.now();
        // установим единое текущее время для всех анимаций
        // Anim.currentTime = time;
        Scene.updateControlsList(this.anims, delta);
        for (let i = 0; i < this.tweens.length; i++) {
            // todo откуда 10?
            this.tweens[i].update(delta * 10);
        }

        if (this.fpsText) {
            this.fpsCounter++;
            if (time - this.lastFpsTime > 1000) {
                this.lastFpsTime = time;
                this.fps = this.fpsCounter;
                this.fpsCounter = 0;
            }
            if (localStorage.getItem("dev")) {
                let t = "FPS:" + this.fps;
                t +=
                    " " +
                    this.mousePos[0] +
                    ", " +
                    this.mousePos[1];

                (<PIXI.Text>(<Label>this.fpsText).pixiElement).text = t;
            }
        }

        // если надо - перестроим граф сцены
        if (this.needResort) {
            // отсортируем все контейнеры на сцене
            this.resortContainer(this.getRootContainer());
            // сбросим флаг о необходимости сортировки
            this.needResort = false;
        }

    }

    /**
     * Пересортировка контролов в отдельном контейнере.
     *
     * HINTS:
     * 1)Отдельным контейнерам можно и нужно задавать createOrder указывающий на их положение в родителе
     * 2)CreateOrder у чайлдов в контейнере относительный по контейнеру, а не абсолютный по игре
     * @param container
     * @param withChildContainers
     */
    resortContainer(container: Container | undefined, withChildContainers = true): void {
        if (container !== undefined) {
            let sorted = container.children.sort((a, b) => {
                if (a.createOrder > b.createOrder) return 1;
                if (a.createOrder < b.createOrder) return -1;
                if (a.createOrder !== undefined && b.createOrder === undefined) return 1;
                if (a.createOrder === undefined && b.createOrder !== undefined) return -1;

                if (a.z > b.z) return 1;
                if (a.z < b.z) return -1;
                if (a.z !== undefined && b.z === undefined) return 1;
                if (a.z === undefined && b.z !== undefined) return -1;

                return 0;
            });
            let i = sorted.length;
            while (--i >= 0) {
                sorted[i].z = i;
                sorted[i].pixiElement.zIndex = i;
            }

            container.pixiElement.children.sort((a, b) => a.zIndex - b.zIndex);

            // сортировка контейнеров в контейнере
            if (withChildContainers) container.children
                .filter((child) => child instanceof Container)
                .forEach((cont) => this.resortContainer(<Container>cont));
        }
    };

    /**
     * Уничтожение отдельного контейнера со всем его содержимым
     * @param container
     */
    disposeContainer(container: Container) {
        if (container.nickname !== Scene.ROOT_CONTAINER) {
            // уберем из массива контролов контролы,
            // которые больше не существуют
            if (this.controls) {
                delete this.controls[container.nickname];
                delete this.controls["root"][container.nickname];
            }
            container.destroy({children: true});
        } else if (container.nickname === Scene.ROOT_CONTAINER) {
            this.anims = {"root": {}};
            //this.spineAnims = {"root": {}};
            this.buttons = {"root": {}};
            //this.particles = {"root": {}};
            for (let key in this.controls) {
                for (let name in this.controls[key]) {
                    //console.log(key, name);
                    if (name !== "root" && this.controls[key][name] !== undefined) {
                        this.controls[key][name].destroy();
                        delete this.controls[key][name];
                    }
                }
            }
            this.controls = {"root": {}};
            container.pixiElement.children.forEach(child => {
                child.destroy();
            });
        }
    }

    dispose() {
        //todo tween dispose
        this.disposeContainer(this.getRootContainer());
        super.dispose();
    }
}
