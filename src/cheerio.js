import * as cheerio from "cheerio";
import { loadCache, appendToCache, saveUpdatedCache } from "./cache.js";
import { saveOutageBatch } from "./sqlite.js";

export async function parseOutages(html, targetLocations = [], targetCity = "edtz", targetMunicipality = "srebrenik") {
    const cache = loadCache()
    const $ = cheerio.load(html);
    const outages = [];
    const allParsedOutages = [];
    const normalizedLocations = targetLocations.map(loc => loc.toLowerCase());

    $(`tr.item[data-ed="${targetCity}"][data-opcina="${targetMunicipality}"]`).each((_, element) => {
        const $row = $(element);
        const cells = $row.find('td');

        if (cells.length >= 4) {
            const location = $(cells[0]).text().trim();
            const address = $(cells[1]).text().trim();
            const date = $(cells[2]).text().trim();
            const timeRange = $(cells[3]).text().trim();

            const [startTime, endTime] = timeRange.split('-').map(t => t.trim());

            appendToCache(cache, targetCity, targetMunicipality, address);

            allParsedOutages.push({
                city: targetCity,
                municipality: targetMunicipality,
                location,
                address,
                date: date.split('.').reverse().join('-'),
                startTime,
                endTime
            });

            if (targetLocations.length > 0) {
                const addressLower = address.toLowerCase();
                const matchesLocation = normalizedLocations.some(loc =>
                    addressLower === loc
                );

                if (!matchesLocation) {
                    return;
                }
            }

            outages.push({
                location,
                address,
                date,
                startTime,
                endTime,
            });
        }
    });

    await saveUpdatedCache(cache);
    if (allParsedOutages.length > 0) {
        saveOutageBatch(allParsedOutages);
    }

    return outages;
}
