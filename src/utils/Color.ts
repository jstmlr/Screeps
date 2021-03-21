import { JOBS } from "../Constants";

export namespace ColorUtils {
    /**
     * Returns a color for the specified action, based on a base palette
     *
     * @export
     * @param {string} baseColor
     * @param {JOBS} action
     */
    export function colorForAction(baseColor: string, action: JOBS) {
        switch (action) {
            case JOBS.HARVEST:  return modifyColor(baseColor,  40);
            case JOBS.RECHARGE: return modifyColor(baseColor, -20);
            case JOBS.BUILD:    return modifyColor(baseColor,  10);
            case JOBS.UPGRADE:  return modifyColor(baseColor,  0);
            default:            return baseColor;
        }
    }

    /**
     * Lightens or darkens an RGB value by a set percentage.
     * Use negative numbers for darkening, positive for lightening.
     *
     * @export
     * @param {string} color string representation of a hex color in the format '#112233' or '112233'
     * @param {number} percent percentage (-100 to 100) to lighten/darken (negative for darken, positive for lighten)
     * @returns {*} the converted number, in '#223344' format
     */
    export function modifyColor(color: string, percent: number) {
        function clamp(v: number) {
            return (v < 0xff ? v < 1 ? 0 : v : 0xff)
        }

        const colorHex = parseInt(color.replace('#', ''), 16);
        const amount = Math.round(2.55 * percent);
        let r = (colorHex >> 16 & 0xff) + amount;
        let g = (colorHex >> 8  & 0xff) + amount;
        let b = (colorHex >> 0  & 0xff) + amount;
        const result = (0x1000000 + clamp(r)
                      * 0x0010000 + clamp(g)
                      * 0x0000100 + clamp(b))
                      & 0x0ffffff;
        return `#${result.toString(16)}`;
    };

}
