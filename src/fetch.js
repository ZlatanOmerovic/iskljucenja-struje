import { logger } from "./logger.js";

export const fetchFromRemote = async(url) => {
    logger.info({ msg: "Fetching URL", url });

    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        },
    });

    if (!response.ok) {
        logger.error({
            msg: "HTTP error during fetch",
            status: response.status
        });
        throw new Error(`Bad HTTP status: ${response.status}`);
    }

    const html = await response.text();
    logger.debug({
        msg: "Fetched HTML length",
        length: html.length
    });

    return html;
}
