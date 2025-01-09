export default {
    /**
     * Сгенерить рандомное число, min и max включительно.
     * @param min
     * @param max
     * @returns {*}
     */
    getRandomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Форматирование под единицы измерений
     * @param num - число для форматирования
     * @param cents - количество символов после разделителя
     * @param step - шаг единицы измерения
     * @param suffix - массив суфиксов единицы измерения
     *
     * Примеры использования:
     * 1)numberFormatMeasure(num, 1, 1024, ["B", "KB", "MB"])
     * Переводит число в байты, килобайты, мегабайты в виде 3.1MB
     * 2)numberFormatMeasure(num, 2, 1000, ["g", "kg"])
     * Переводит число в граммы, килограммы в виде 3.14kg
     * 3)numberFormatMeasure(num, 0, 1000, ["", "k","kk"])
     * Переводит число в вид, где тысячи заменяются на "k"; 31416 => 31k
     */
    numberFormatMeasure(num: number, cents: number | number[], step: number, suffix: string[] = [""]): string {
        let n = num;
        let sn = 0;
        for (let i = 1; i < suffix.length; i++) {
            // console.warn(n, step);
            if (n >= step) {
                sn = i;
                n = n / step;
            }
        }
        return this.numberFormat(n, Array.isArray(cents) ? cents[sn] : cents) + suffix[sn];
    }
}