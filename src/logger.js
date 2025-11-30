import pino from "pino";

export const logger = pino({
    level: "debug",
    transport: {
        targets: [
            {
                target: "pino/file",
                options: { destination: "./logs/app.log" },
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
