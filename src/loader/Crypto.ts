import LoaderCache from "./LoaderCache";
import Loader from "./Loader";

export default class Crypto {

    // инициализация дефолтного сида
    private nextRand: number = 1;

    reset() {
        this.nextRand = 1;
    }

    // Ограничим выдаваемое число 255, т.к. нам нужна последовательность байт
    private rand() {
        const RAND_MAX = 255;
        this.nextRand = (this.nextRand * 16807) % 65536;
        return ~~(this.nextRand % (RAND_MAX + 1));
    }

    private hashCode(str: string): number {
        let hash = 0, i, chr;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    private makeKey(seedString: string, keyLength = 2048) {
        // установка сида из строки
        this.nextRand = this.hashCode(seedString);
        let key = [];
        for (let i = 0; i < keyLength; i++) {
            key.push(this.rand());
        }
        //console.log(key[0],key[1],key[2],key[3],key.length);
        return key;
    }

    public decrypt(url: string, view: Uint8Array) {
        // сделаем ключ из имени файла без расширения
        let s = this.makeKey((<string>url.split("/").pop()).split(".")[0]);

        let x;

        // собственно само шифрование/дешифрование данных ключем
        let i = 0;
        let j = 0;
        for (let y = 0; y < view.byteLength; y++) {
            i = (i + 1) % s.length;
            j = (j + s[i]) % 256;
            x = s[i];
            s[i] = s[j];
            s[j] = x;
            view[y] = view[y] ^ s[(s[i] + s[j]) % 256];
        }
    }

    public makeImg(url: string, cacheData: string | Blob | undefined, view: Uint8Array | undefined): HTMLImageElement {
        // @ts-ignore
        const urlCreator = window.URL || window.webkitURL;
        const img = new Image();

        // альтернативный путь создания данных
        // var binary = "";
        // var len = view.byteLength;
        // for (var i = 0; i < len; i++) {
        //     binary += String.fromCharCode(view[i]);
        // }
        // binary = "data:image/png;base64, " + window.btoa(binary);
        // console.log(binary);
        // img.src = binary;

        if (cacheData !== undefined) {
            img.src = "" + cacheData; //urlCreator.createObjectURL(cacheData);
            // console.log("dataFromCache: " + url);
        } else if (view !== undefined) {
            console.log("CRYPTED PNG");
            console.log(url);
            if (view[0] === 137 && view[1] === 80 && view[2] === 78) {
                //console.log("Decrypt - OK");
            } else {
                console.error("Decrypt - FAIL");
                console.error(view[0], view[1], view[2]);
            }
            const blob = new Blob([view], {type: "image/png"});
            let src = urlCreator.createObjectURL(blob);

            // если кэширование отключено - грохнем данные сразу, иначе кэш будет заниматься этим
            if (!LoaderCache.isNeedCache()) {
                img.onload = function () {
                    console.log("revokeObjectURL");
                    urlCreator.revokeObjectURL(src);
                    this.onload = null;
                }.bind(img);
            }

            if (LoaderCache.isNeedCache()) {
                LoaderCache.setData(Loader.assetsPath + "_" + Loader.subtype, url, src);
            }

            img.src = src;
        }

        return img;
    }

    public makeJson(url: string, cacheData: Blob | string | undefined, view: Uint8Array | undefined): FileReader {
        let fr = new FileReader();
        if (cacheData !== undefined && typeof (cacheData) !== "string") {
            fr.readAsText(cacheData);
            //console.log("dataFromCache: " + r.url);
        } else if (view !== undefined) {
            //console.log("CRYPTED JSON: ", r.url);
            // раз мы эти блобы не грузим, следовательно они не палятся
            let blob = new Blob([view], {type: "application/json"});
            if (LoaderCache.isNeedCache()) {
                LoaderCache.setData(Loader.assetsPath + "_" + Loader.subtype, url, blob);
            }
            fr.readAsText(blob);
        }
        return fr;
    }

    public makeAtlas(url: string, cacheData: Blob | string | undefined, view: Uint8Array | undefined): FileReader {
        let fr = new FileReader();
        if (cacheData !== undefined && typeof (cacheData) !== "string") {
            fr.readAsText(cacheData);
            //console.log("dataFromCache: " + r.url);
        } else if (view !== undefined) {
            //console.log("CRYPTED ATLAS: ", r.url);
            // раз мы эти блобы не грузим, следовательно они не палятся
            let blob = new Blob([view], {type: "text"});
            if (LoaderCache.isNeedCache()) {
                LoaderCache.setData(Loader.assetsPath + "_" + Loader.subtype, url, blob);
            }
            fr.readAsText(blob);
        }
        return fr;
    }
}