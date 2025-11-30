import { logger } from "./logger.js";

const CHANNEL_TOKEN = process.env.VIBER_CHANNEL_TOKEN;
const CHANNEL_API_URL = "https://chatapi.viber.com/pa/post";
const USER_ID = process.env.VIBER_SUPERADMIN_USER_ID;

export async function postToChannel(message) {
    try {
        const response = await fetch(CHANNEL_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                auth_token: CHANNEL_TOKEN,
                from: USER_ID,
                type: "text",
                text: message,
            })
        });

        const result = await response.json();
        if (result.status === 0) {
            logger.info({
                msg: "Posted to Viber channel successfully",
                messageToken: result.message_token,
                message,
            });
            return { success: true, data: result };
        }

        logger.error({
            msg: "Failed to post to Viber channel",
            status: result.status,
            statusMessage: result.status_message,
            message
        });
        return { success: false, error: result.status_message };
    } catch (error) {
        logger.error({
            msg: "Error posting to Viber channel",
            error: error.message,
            stack: error.stack,
            message
        });
        return { success: false, error: error.message };
    }
}
