import {logger} from "./logger.js";
import ngrok from "@ngrok/ngrok";

export const getWebhookUrl = async (port, isDevelopment = false) => {
    if (isDevelopment)
        return getWebhookUrlFromNgrok(port);

    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
        logger.error({
            msg: "WEBHOOK_URL not set in production"
        });
        process.exit(1);
    }

    return webhookUrl;
}

export const getWebhookUrlFromNgrok = async (addr) => {
    let webhookUrl;

    try {
        const listener = await ngrok.connect({
            addr,
            authtoken: process.env.NGROK_AUTH_TOKEN
        });

        const ngrokTunnelUrl = listener.url();
        logger.info({
            msg: "ngrok tunnel established",
            url: ngrokTunnelUrl
        });

        webhookUrl = `${ngrokTunnelUrl}/viber/webhook`;
    } catch (error) {
        logger.error({
            msg: "Failed to start ngrok",
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }

    return webhookUrl;
}
