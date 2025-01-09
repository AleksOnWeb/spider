import Crypto from "./Crypto";
// import { createHash } from "crypto";
import { isCrypted } from "./Loader";

export default class StaticCache {
    private static _dataSrc: { [key: string]: string } = {};
    private static _crypto = new Crypto();
    private static _urlCreator = window.URL || window.webkitURL;

    static async loadSrc(src: string): Promise<string> {
        // url - по которому будет грузиться изображение
        let url = isCrypted() ? "./content/" + this.makeNameHash(src) + ".bin" : src;
        // сделаем из url'а Blob
        let blob = await fetch(url).then(r => r.blob());
        // прочтем Blob как Uint8Array
        let view = await new Promise(resolve => {
            let reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result));
            reader.readAsArrayBuffer(blob);
        });

        if (isCrypted()) {
            // расшифруем
            this._crypto.decrypt(src, view);
        }
        // запомним расшифрованный ресурс
        this._dataSrc[src] = this._urlCreator.createObjectURL(new Blob([view], { type: "image/png" }));
        // вернем расшифрованный ресурс
        return this._dataSrc[src];
    }

    static getDataSrc(src: string): string {
        return this._dataSrc[src];
    }

    static makeNameHash(name: string): string {
        return createHash("sha256")
            .update(name.substr(name.indexOf("assets/")))
            .digest("hex");
    }
}