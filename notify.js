import "dotenv/config";

import { getOutagesWithinTimeframe, markAsNotified1h, markAsNotified24h } from "./src/sqlite.js";
import { locationsOfInterest } from "./locations.js";
import { postToChannel } from "./src/viber.js";
import { schedule as cronSchedule } from 'node-cron';
import {logger} from "./src/logger.js";

const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
let isTestDryRun = (['--test', '--dry-run', '-t', '-d'].includes(process.argv[2])) && IS_DEVELOPMENT;

const notify = async (outages, type = 24) => {
    const grouping = {};

    for (const outage of outages) {
        if (!Object.hasOwn(grouping, outage.date))
            grouping[outage.date] = {}

        const timeGrouping = `${outage.start_time}_${outage.end_time}`;
        if (!Object.hasOwn(grouping[outage.date], timeGrouping))
            grouping[outage.date][timeGrouping] = [];

        grouping[outage.date][timeGrouping].push({
            id: outage.id,
            location: outage.location,
            address: outage.address,
            date: outage.date,
            start_time: outage.start_time,
            end_time: outage.end_time,
        });

        if (isTestDryRun)
            continue;

        if (type === 24)
            markAsNotified24h(outage.id);

        if (type === 1)
            markAsNotified1h(outage.id);
    }

    const messages = [];
    for (const group of Object.keys(grouping)) {
        if (!Object.hasOwn(grouping, group))
            continue;

        const date = group.split('-').reverse().join('.');
        const locations = [];
        let startTime = null, endTime = null;

        for (const subgroup of Object.keys(grouping[group])) {
            if (!Object.hasOwn(grouping[group], subgroup))
                continue;

            for (const [index, item] of grouping[group][subgroup].entries()) {
                const newLine = (index + 1) % 5 === 0 ? "\n" : '';
                locations.push(` 📍  ${item.address}${newLine}`);

                if (startTime === null)
                    startTime = item.start_time;

                if (endTime === null)
                    endTime = item.end_time;
            }
        }

        if (startTime === null || endTime === null || locations.length === 0)
            continue;

        let label = `⚡ Planirana isključenja struje u sljedeća 24h\n\n`;
        if (type === 1)
            label = `🛑 Isključenja struje u sljedećih sat vremena!\n\n`;

        const message =
            label +
            `🗓️ Datum: ${date}\n\n` +
            `⏱️ Isključenje: u ${startTime}h\n` +
            `🕡️ Uključenje: u ${endTime}h\n\n` +
            `🏠 Mjesta i naselja (${locations.length}):\n\n` +
            `${locations.join("\n")}\n`;

        messages.push(message);
    }

    for(const message of messages) {
        if (isTestDryRun) {
            logger.info({
                msg: "Message test",
                message,
            });
            continue;
        }

        await postToChannel(message);
    }
}

const main = async () => {
    const targetLocations = locationsOfInterest;

    const outages24h = getOutagesWithinTimeframe(24, 1, targetLocations);
    const outages1h = getOutagesWithinTimeframe(1, 0, targetLocations);

    await notify(outages24h, 24);
    await notify(outages1h, 1);
};

const expression = '* * * * *';
if (!isTestDryRun)
    cronSchedule(expression, async () => await main());
else {
    const expression = '* * * * *';
    logger.info({
        msg: "Running node-cron for testing purposes...",
        expression
    });
    cronSchedule(expression, async () => await main());
}
