import fs from "fs/promises";
import { join } from "path";

export const cacheFile = join(import.meta.dirname, '..', 'cache.json');

export const loadCache = async () => {
    let cache = {};
    try {
        const cacheContent = await fs.readFile(cacheFile, "utf8");
        cache = JSON.parse(cacheContent);
    } catch {}

    return cache;
}

export const appendToCache = (cache, city, municipality, location) => {
    if (!Object.hasOwn(cache, city))
        cache[city] = {};

    if (!Object.hasOwn(cache[city], municipality))
        cache[city][municipality] = [];

    if (!new Set(cache[city][municipality]).has(location))
        cache[city][municipality].push(location);
};

export const saveUpdatedCache = async (cache) => {
    await fs.writeFile(cacheFile, JSON.stringify(cache, null, 4));
};
