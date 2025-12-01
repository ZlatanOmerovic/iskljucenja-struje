import "dotenv/config";

import express from "express";
import { logger } from "./src/logger.js";
import { getWebhookUrl } from "./src/webhook-url.js";
import { createServer as createUnsecureServer } from 'http';
import { createServer as createSecureServer } from 'https';
import { readFile } from "fs/promises";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', '69420');
    next();
});

app.get("/", (req, res) => {
    res.send("Viber Channel Webhook Server");
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/viber/webhook", (req, res) => {
    const event = req.body.event;

    logger.info({
        msg: "Viber webhook received",
        event: event,
        body: req.body
    });

    switch (event) {
        case "conversation_started":
            logger.info({
                msg: "Conversation started",
                userId: req.body.user?.id,
                userName: req.body.user?.name
            });
            break;

        case "subscribed":
            logger.info({
                msg: "User subscribed",
                userId: req.body.user?.id,
                userName: req.body.user?.name
            });
            break;

        case "unsubscribed":
            logger.info({
                msg: "User unsubscribed",
                userId: req.body.user_id
            });
            break;

        case "message":
            logger.info({
                msg: "Message received",
                userId: req.body.sender?.id,
                userName: req.body.sender?.name,
                messageType: req.body.message?.type,
                text: req.body.message?.text
            });
            break;

        case "delivered":
        case "seen":
            logger.debug({
                msg: `Message ${event}`,
                userId: req.body.user_id,
                messageToken: req.body.message_token
            });
            break;

        case "webhook":
            logger.debug({
                msg: `Webhook`,
                body: req.body,
            });
            break;

        default:
            logger.debug({
                msg: "Unknown event type",
                event: event,
                body: req.body,
            });
    }

    res.status(200).json({ status: 0, status_message: "ok" });
});

const CHANNEL_TOKEN = process.env.VIBER_CHANNEL_TOKEN;
async function setWebhook(webhookUrl) {
    try {
        const response = await fetch("https://chatapi.viber.com/pa/set_webhook", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                auth_token: CHANNEL_TOKEN,
                url: webhookUrl,
                event_types: [
                    "delivered",
                    "seen",
                    "failed",
                    "subscribed",
                    "unsubscribed",
                    "conversation_started"
                ]
            })
        });

        const result = await response.json();
        if (result.status === 0) {
            logger.info({
                msg: "Webhook set successfully",
                webhookUrl: webhookUrl,
                eventTypes: result.event_types
            });
            return { success: true, data: result };
        } else {
            logger.error({
                msg: "Failed to set webhook",
                status: result.status,
                statusMessage: result.status_message
            });
            return { success: false, error: result.status_message };
        }
    } catch (error) {
        logger.error({
            msg: "Error setting webhook",
            error: error.message,
            stack: error.stack
        });
        return { success: false, error: error.message };
    }
}

const PORT = process.env.PORT || 3000;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

const serverListenerHandler = async () => {
    logger.info({
        msg: "Viber channel webhook server started",
        port: PORT,
        environment: process.env.NODE_ENV
    });

    if (!CHANNEL_TOKEN) {
        logger.error({
            msg: "VIBER_CHANNEL_TOKEN not set"
        });
        process.exit(1);
    }

    const webhookUrl = await getWebhookUrl(PORT, IS_DEVELOPMENT);
    const result = await setWebhook(webhookUrl);

    if (!result.success) {
        logger.error({
            msg: "Failed to set webhook, exiting",
            error: result.error
        });
        process.exit(1);
    }
};

let server = null;

if (IS_DEVELOPMENT) {
    server = createUnsecureServer(serverListenerHandler);
} else {
    const [key, cert] = await Promise.all([
        readFile(process.env.SSL_KEY_PATH),
        readFile(process.env.SSL_CERT_PATH),
    ]);

    server = createSecureServer({ key, cert }, app);
}

server.listen(PORT || 443, '0.0.0.0', serverListenerHandler);

const shutdown = async () => {
    logger.info("Shutting down gracefully");

    server.close(() => logger.info("Server closed"));
    process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
