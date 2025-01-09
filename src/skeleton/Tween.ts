import Scene from "./Scene";
import Control from "./gui/Control";

export type TweenController = ((c: Control, k: number) => void)

export default class Tween {
    private scene: Scene;
    public controls: Control[];
    private controllers: TweenController[];
    public started: boolean;
    public finished: boolean;
    private length: number;
    private timer: number;
    private repeat: number;
    private callback: Callback | undefined;
    public restorePos: boolean;

    constructor(scene: Scene) {
        this.scene = scene;
        this.controls = [];
        this.started = false; // устанавливается на старте твина и снимается когда твин отработал
        this.finished = false; // устанавливается когда твин отработал
        this.controllers = []; // функции-обработчики
        this.length = 0;
        this.callback = undefined;

        /**
         * Восстанавливать оригинальные позиции контролов после завершения
         * @type {boolean}
         */
        this.restorePos = false;
    }

    /**
     * Добавить контрол в набор, которыми будем манипулировать
     * @param name string|object Если строка, то ищем по имени в контролах сцены | Если объект, то сразу добавляем
     * @param containerName при добавлении объекта по имени, можно указать его контейнер
     */
    addControl(name: string | Control, containerName?: string): Tween {
        if (typeof name === "string") {
            let c = this.scene.getControl(name, containerName);
            if (c) this.controls.push(c);
        } else {
            this.controls.push(name);
        }
        return this;
    }

    do(map: { [param: string]: (number | string)[] }, ease = Tween.Linear): Tween {
        let controller: TweenController;
        let simpleParams = true;
        // check params
        for (let param in map) {
            for (let i = 0; i < 2; i++) {
                if (isNaN(map[param][i])) {
                    simpleParams = false;
                    break;
                }
            }
            if(!simpleParams)break;
        }

        if (simpleParams) {
            // if params simple then make controller with less checks on every iteration
            controller = (c: Control, k: number) => {
                for (let param in map) {
                    if (c[param] !== undefined) {
                        c[param] = map[param][0] + (map[param][1] - map[param][0]) * ease(k);
                    }
                }
            };
        } else {
            controller = (c: Control, k: number) => {
                for (let param in map) {
                    if (c[param] !== undefined) {
                        let ps = <number>(isNaN(map[param][0]) ? c[map[param][0]] : map[param][0]);
                        let pe = <number>(isNaN(map[param][1]) ? c[map[param][1]] : map[param][1]);
                        c[param] = ps + (pe - ps) * ease(k);
                    }
                }
            };
        }

        this.addController(controller);
        return this;
    }

    /**
     * Добавление произвольного контроллера
     * @param controller
     * @returns {Tween}
     */
    addController(controller: TweenController): Tween {
        this.controllers.push(controller);
        return this;
    }

    /**
     * Удаление контроллеров твина
     * @returns {Tween}
     */
    clearControllers(): Tween {
        this.controllers = [];
        return this;
    }

    /**
     * Восстанавливать оригинальные позиции контролов после завершения
     * @param value
     * @returns {Tween}
     */
    restoreOriginalPositions(value = true): Tween {
        this.restorePos = value;
        return this;
    }

    /**
     * Установка стартовых значений всем контролам
     */
    setStartValues(): Tween {
        this.controls.forEach((c) => {
            this.controllers.forEach((fun) => fun(c, 0));
        });
        return this;
    }

    /**
     * Запуск твина
     * @param time длительность
     * @param callback коллбэк, который будет вызван после окончания работы твина
     * @param repeat кол-во повторов. -1 === бесконечно
     * @returns {Tween}
     */
    start(time: number, callback?: Callback, repeat = 0): Tween {
        this.length = time;
        this.callback = callback;
        this.started = true;
        this.timer = 0;
        this.repeat = repeat;
        return this;
    }

    /**
     * Промис для метода start
     * @param time длительность
     * @param repeat кол-во повторов. -1 === бесконечно
     */
    startPromise(time: number, repeat = 0): Promise<void> {
        return new Promise<void>((resolve) => this.start(time, resolve, repeat));
    }

    update(delta: number): void {
        if (!this.started || this.controllers.length === 0) {
            return;
        }

        this.timer += delta;
        // TODO продумать repeat ещё раз (т.к. вот из-за этой строчки repeat будет работать криво)
        this.timer = this.timer > this.length ? this.length : this.timer;
        let k = this.timer / this.length;
        this.controls.forEach((c) => {
            this.controllers.forEach((fun) => fun(c, k));
        });

        if (this.timer >= this.length) {
            if (this.repeat > 0) {
                this.repeat--;
            }
            if (this.repeat === 0) {
                this.stop();
                if (this.restorePos) {
                    this.controls.forEach((c) => c.restorePos());
                }

                if (this.callback) {
                    this.callback();
                }
            } else {
                this.timer = 0;
            }
        }
    }

    /**
     * Остановка твина (без вызова коллбэка (!))
     * @return number k - момент, на котором остановились (от 0 до 1 (без учёта ease!))
     */
    stop(): number {
        this.started = false;
        if (this.restorePos) {
            this.controls.forEach((c) => c.restorePos());
        }
        this.finished = true;

        // вернём текущую k
        return this.timer / this.length;
    }

    /**
     * деструктор твина
     */
    destroy(): void {
        this.stop();
        this.controls = [];
        this.clearControllers();
    }

    // ==============================================================================================
    // ======================================== EASE-функции ========================================
    // ==============================================================================================

    /**
     * pipe для ease-функций, т.е. суперпозиция нескольких ease (для универсального реверса, например)
     * функции-параметры применяются слева направо
     * @example Tween.Pipe(Tween.LinearBack, Tween.Reverse, Tween.CubicIn)
     * @param easings функции
     * @returns {*|(function(...[*]): *)} суперпозиция слева направо
     */
    public static Pipe = (...easings: ((k: number) => number)[]) => easings.reduce((f, g) => (k: number) => g(f(k)));

    // TODO удалить избыточность (проверить соответствия результатов суперпозиций с соответствующими функциями)

    // ============ с параметрами ============

    /**
     * Easing выстраиваемый по точкам
     * @param p массив точек, где параметр k в каждом следующем элементе должен быть не меньше k в предыдущем
     * @example Tween.PointEasing({ k: 0, t: 0 }, { k: 0.2, t: 1 }, { k: 0.4, t: 0 }, { k: 1, t: 0 });
     */
    public static PointEasing = function (...p: { k: number, t: number }[]): (k: number) => number {
        let ki;
        return (k) => {
            ki = 0;
            while (ki < p.length && k >= p[ki].k) ki++;
            return ki < p.length ? (p[ki].t + ((p[ki].t - p[ki - 1].t) / (p[ki].k - p[ki - 1].k)) * (k - p[ki].k)) : p[ki - 1].t;
        };
    };

    /**
     * Циклический сдвиг
     * (сдвигает все easing'и после себя вправо по x на d)
     */
    public static Shift = function (d: number): (k: number) => number {
        d -= Math.floor(d);
        return (k) => (k - d > 0 ? k - d : k - d + 1);
    };

    /**
     * Умножение (сжимает easing по x)
     */
    public static Mult = function (d: number): (k: number) => number {
        return (k) => k * d;
    };

    // =========== без параметров ============

    public static Linear = function (k: number): number {
        return k;
    };

    public static Reverse = function (k: number): number {
        return -k + 1;
    };

    public static Cut = function (k: number): number {
        if (k > 1) return 1;
        if (k < 0) return 0;
        return k;
    };

    public static LinearBack = function (k: number): number {
        return k < 0.5 ? 2 * k : -2 * k + 2;
    };

    public static QuadraticIn = function (k: number): number {
        return k * k;
    };
    public static QuadraticOut = function (k: number): number {
        return k * (2 - k);
    };
    public static QuadraticInOut = function (k: number): number {
        if ((k *= 2) < 1) return 0.5 * k * k;
        return -0.5 * (--k * (k - 2) - 1);
    };

    public static CubicIn = function (k: number): number {
        return k * k * k;
    };
    public static CubicOut = function (k: number): number {
        return --k * k * k + 1;
    };
    public static CubicInOut = function (k: number): number {
        if ((k *= 2) < 1) return 0.5 * k * k * k;
        return 0.5 * ((k -= 2) * k * k + 2);
    };
    /**
     * @deprecated TODO проверить работает ли pipe так же и удалить
     * полный эквивалент: Tween.Pipe(Tween.LinearBack, Tween.CubicIn)
     */
    public static CubicInReverse = function (k: number): number {
        let rs;
        if (k * 2 < 1) {
            rs = Tween.CubicIn(k * 2);
        } else {
            rs = Tween.CubicIn((1 - k) * 2);
        }
        return rs;
    };

    public static QuarticIn = function (k: number): number {
        return k * k * k * k;
    };
    public static QuarticOut = function (k: number): number {
        return 1 - --k * k * k * k;
    };
    public static QuarticInOut = function (k: number): number {
        if ((k *= 2) < 1) return 0.5 * k * k * k * k;
        return -0.5 * ((k -= 2) * k * k * k - 2);
    };
    /**
     * @deprecated TODO проверить работает ли pipe так же и удалить
     * полный эквивалент: Tween.Pipe(Tween.LinearBack, Tween.QuarticIn);
     */
    public static QuarticInReverse = function (k: number): number {
        let rs;
        if (k * 2 < 1) {
            rs = Tween.QuarticIn(k * 2);
        } else {
            rs = Tween.QuarticIn((1 - k) * 2);
        }
        return rs;
    };

    public static QuinticIn = function (k: number): number {
        return k * k * k * k * k;
    };
    public static QuinticOut = function (k: number): number {
        return --k * k * k * k * k + 1;
    };
    public static QuinticInOut = function (k: number): number {
        if ((k *= 2) < 1) return 0.5 * k * k * k * k * k;
        return 0.5 * ((k -= 2) * k * k * k * k + 2);
    };

    /**
     * @return {number}
     */
    public static BounceIn = function (k: number): number {
        return 1 - Tween.BounceOut(1 - k);
    };
    /**
     * @return {number}
     */
    public static BounceOut = function (k: number): number {
        if (k < 1 / 2.75) {
            return 7.5625 * k * k;
        } else if (k < 2 / 2.75) {
            return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
        } else if (k < 2.5 / 2.75) {
            return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
        } else {
            return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
        }
    };
    public static BounceInOut = function (k: number): number {
        if (k < 0.5) return Tween.BounceIn(k * 2) * 0.5;
        return Tween.BounceOut(k * 2 - 1) * 0.5 + 0.5;
    };
    /**
     * @return {number}
     */
    public static SinusoidalIn = function (k: number): number {
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        return 1 - Math.cos(k * Math.PI / 2);
    };
    /**
     * @return {number}
     */
    public static SinusoidalOut = function (k: number): number {
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        return Math.sin(k * Math.PI / 2);
    };
    /**
     * @return {number}
     */
    public static SinusoidalInOut = function (k: number): number {
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        return 0.5 * (1 - Math.cos(Math.PI * k));
    };

    public static ExponentialIn = function (k: number): number {
        return k === 0 ? 0 : Math.pow(1024, k - 1);
    };
    public static ExponentialOut = function (k: number): number {
        return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
    };
    public static ExponentialInOut = function (k: number): number {
        if (k === 0) return 0;
        if (k === 1) return 1;
        if ((k *= 2) < 1) return 0.5 * Math.pow(1024, k - 1);
        return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
    };

    public static CircularIn = function (k: number): number {
        return 1 - Math.sqrt(1 - k * k);
    };
    public static CircularOut = function (k: number): number {
        return Math.sqrt(1 - --k * k);
    };
    public static CircularInOut = function (k: number): number {
        if ((k *= 2) < 1) return -0.5 * (Math.sqrt(1 - k * k) - 1);
        return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
    };

    public static ElasticIn = function (k: number): number {
        let s,
            a = 0.1,
            p = 0.4;
        if (k === 0) return 0;
        if (k === 1) return 1;
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else s = p * Math.asin(1 / a) / (2 * Math.PI);
        return -(a * Math.pow(2, 10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p));
    };
    public static ElasticOut = function (k: number): number {
        let s,
            a = 0.1,
            p = 0.4;
        if (k === 0) return 0;
        if (k === 1) return 1;
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else s = p * Math.asin(1 / a) / (2 * Math.PI);
        return a * Math.pow(2, -10 * k) * Math.sin((k - s) * (2 * Math.PI) / p) + 1;
    };
    public static ElasticInOut = function (k: number): number {
        let s,
            a = 0.1,
            p = 0.4;
        if (k === 0) return 0;
        if (k === 1) return 1;
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else s = p * Math.asin(1 / a) / (2 * Math.PI);
        if ((k *= 2) < 1)
            return -0.5 * (a * Math.pow(2, 10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p));
        return a * Math.pow(2, -10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;
    };

    public static BackIn = function (k: number): number {
        let s = 1.70158;
        return k * k * ((s + 1) * k - s);
    };
    public static BackOut = function (k: number): number {
        let s = 1.70158;
        return --k * k * ((s + 1) * k + s) + 1;
    };
    public static BackInOut = function (k: number): number {
        let s = 1.70158 * 1.525;
        if ((k *= 2) < 1) return 0.5 * (k * k * ((s + 1) * k - s));
        return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
    };
}