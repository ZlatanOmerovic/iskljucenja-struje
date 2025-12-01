import pino from "pino";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);
const logPath = join(projectRoot, "logs", "app.log");

export const logger = pino({
    level: "debug",
    transport: {
        targets: [
            {
                target: "pino/file",
                options: { destination: logPath },
                level: "info",
            },
            {
                target: "pino-pretty",
                options: { colorize: true },
                level: "debug",
            }
        ]
    }
});
