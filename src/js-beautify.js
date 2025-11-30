import { logger } from "./logger.js";
import beautify from "js-beautify";
import fs from "node:fs/promises";

export const formatHtml = async (html, outputFilename) => {
    const formatted = beautify.html(html, {
        indent_size: 2,
        indent_char: " ",
        max_preserve_newlines: 1,
        preserve_newlines: true,
        indent_inner_html: true,
        wrap_line_length: 120,
        unformatted: ["code", "pre", "em", "strong", "span"],
        content_unformatted: ["pre", "textarea"]
    });

    logger.info({ msg: "HTML formatted successfully" });
    await fs.writeFile(outputFilename, formatted, "utf8");
    logger.info({ msg: `Saved ${outputFilename}` });
}
