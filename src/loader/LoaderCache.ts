/**
 * кэш для лоадера
 * храним загруженные данные до определенной глубины
 * удаляем старые при запуске лоадера
 */
export default class LoaderCache {
    /**
     * данные в кэше
     */
    protected static cache: { [key: string]: { id: number, map: { [key: string]: Blob | string } } } = {};

    /**
     * глубина кэша
     */
    protected static readonly CACHE_DEEP = 2;

    /**
     * текущий ид уровня кэширования, при каждом запуске лоадера +1
     */
    private static _id: number = 0;

    /**
     * Очистка кеша до указанной глубины
     * @param cacheDeep - глубина сохраняемого кеша. 0 - очистить всё
     */
    public static clean(cacheDeep: number = this.CACHE_DEEP): void {
        console.log("clean cache id=" + this._id);
        console.log(this.cache);
        for (let path in this.cache) {
            if (this.cache[path].id + cacheDeep <= this._id) {
                console.warn("DELETE FROM CACHE: " + path);
                this.freeItem(this.cache[path]);
                delete this.cache[path];
            }
        }
    }

    /**
     * уничтожить запись в кэше
     * @param data
     */
    private static freeItem(data: any) {
        // @ts-ignore
        const urlCreator = window.URL || window.webkitURL;

        // идем по всем данным в кэше
        for (let k in data.map) {
            let item = data.map[k];
            // если это ссылка на блоб
            if (typeof item === "string" && item.startsWith("blob")) {
                urlCreator.revokeObjectURL(item);
            } else if (typeof item === "object" && item.constructor.name === "Blob") {
                // или сам блоб
                const url = urlCreator.createObjectURL(item);
                urlCreator.revokeObjectURL(url);
            }
        }
    }

    /**
     * Получаем данные из кеша
     * @param path - папка ресурс-листа
     * @param url - url файла
     */
    static getData(path: string, url: string): Blob | string | undefined {
        if (this.cache[path] !== undefined) {
            return this.cache[path].map[url];
        }
        return undefined;
    }

    /**
     * Сохраняем данные в кеш
     * @param path
     * @param url
     * @param data
     */
    static setData(path: string, url: string, data: Blob | string) {
        // не кешируем сообщения об ошибках
        if (path === "undefined_undefined") return;

        // проверок на undefined, быть не должно.
        // если в этом месте падает значит не правильно используется preparePath
        this.cache[path].map[url] = data;
    }

    /**
     * Подготовим кеш к получению новых данных.
     * Если папка уже присутствует в кеше - обновим id
     * @param path - папка ресурс-листа
     */
    public static preparePath(path: string) {
        this._id++;
        if (this.cache[path]) {
            this.cache[path].id = this._id;
        } else {
            this.cache[path] = { id: this._id, map: {} };
        }
    }

    public static isNeedCache(): boolean {
        return true; // TODO пока включаем всегда на время теста
        // return localStorage.getItem("crypt") === "1" && localStorage.getItem("cryptCache") === "1";
    }
}