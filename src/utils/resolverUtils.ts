import { DataRange } from "../types.js";

/**
 * Binary search to find the match of a data range list at the index provided, if there is one
 * @param index Index of the item you are looking for
 * @param items List of the DataRanges which hold the data being retrieved
 * @returns The data of the DataRange, if a match is found
 */
export function findMatchInRange<T>(index: number, items?: DataRange<T>[]): DataRange<T> | undefined {
  if (!items) return undefined;
  let lo = 0;
  let hi = items.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const item = items[mid];
    if (index < item.start) hi = mid - 1;
    else if (index > item.end) lo = mid + 1;
    else return item;
  }
  return undefined;
}
