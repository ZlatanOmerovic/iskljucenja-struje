import "dotenv/config";

import { logger } from "./src/logger.js";
import { parseOutages } from "./src/cheerio.js";
import { formatHtml } from "./src/js-beautify.js";
import { fetchFromRemote } from "./src/fetch.js";
import { join } from "path";
import { locationsOfInterest } from "./locations.js";
import { initDatabaseSchema } from "./src/sqlite.js";

const __dirname = import.meta.dirname;
const url = process.env.REMOTE_URL || "https://www.epbih.ba/stranica/servisne-informacije#planska-iskljucenja-elektricne-energije";

async function main() {
    try {
        initDatabaseSchema();

        const html = await fetchFromRemote(url);
        if (process.env.NODE_ENV === "development")
            await formatHtml(html, join(__dirname, 'temp.html'));

        await parseOutages(html, locationsOfInterest);
    } catch (error) {
        logger.error({
            msg: "Failed to fetch data from remote.",
            error,
        });
    }
}

(async () => {
    try {
        await main();
    } catch (err) {
        logger.fatal({ msg: "Fatal error in main()", err });
        process.exit(1);
    }
})();
