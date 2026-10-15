/**
 * Cantillation marks: the accent block U+0591–U+05AF, meteg/silluq
 * (U+05BD) and paseq (U+05C0 ׀, plus the thin space the Masorah text puts
 * before it). Nikud (U+05B0–U+05BC, U+05C1–U+05C2, U+05C4–U+05C5, U+05C7),
 * maqaf (U+05BE) and sof pasuk (U+05C3) are left alone.
 */
const TAAMIM = /[֑-ֽ֯]|\s?׀/g

export const stripTaamim = (text: string) => text.replace(TAAMIM, '')
