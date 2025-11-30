import { logger } from "./logger.js";
import Database from "better-sqlite3";
import { join } from "node:path";

export const databasePath = join(import.meta.dirname, '..', 'outages.sqlite');
export const db = new Database(databasePath);

export const initDatabaseSchema = () => {
    db.exec(`CREATE TABLE IF NOT EXISTS outages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT NOT NULL,
            municipality TEXT NOT NULL,
            location TEXT NOT NULL,
            address TEXT NOT NULL,
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            notified_24h INTEGER DEFAULT 0 CHECK(notified_24h IN (0, 1)),
            notified_24h_at TEXT,
            notified_1h INTEGER DEFAULT 0 CHECK(notified_1h IN (0, 1)),
            notified_1h_at TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            UNIQUE(city, municipality, address, date, start_time)
        )`);
};

export function saveOutageBatch(outagesList) {
    const insertStmt = db.prepare(`INSERT INTO outages (city, municipality, location, address, date, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(city, municipality, address, date, start_time)
        DO NOTHING`);

    const insertMany = db.transaction((outages) => {
        let inserted = 0;
        for (const outage of outages) {
            const result = insertStmt.run(
                outage.city,
                outage.municipality,
                outage.location,
                outage.address,
                outage.date,
                outage.startTime,
                outage.endTime
            );
            inserted += result.changes;
        }
        return inserted;
    });

    try {
        const inserted = insertMany(outagesList);
        logger.info({
            msg: "Outages saved to database",
            total: outagesList.length,
            inserted
        });
        return inserted;
    } catch (error) {
        logger.error({
            msg: "Error saving outages in transaction",
            error: error.message,
            stack: error.stack
        });
        return 0;
    }
}

function getEuropeSarajevoOffsetHours() {
    const part = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Sarajevo",
        timeZoneName: "shortOffset"
    }).formatToParts(new Date())
        .find(p => p.type === "timeZoneName")
        .value;

    return parseInt(part.replace("GMT", ""));
}

export function getOutagesWithinTimeframe(hours, minHours = 0, targetLocations = []) {
    try {
        const offset = getEuropeSarajevoOffsetHours();
        let query = `SELECT * FROM outages 
            WHERE ${hours === 24 ? 'notified_24h' : 'notified_1h'} = 0
            AND datetime(date || ' ' || start_time) <= datetime('now', '+${hours} hours', '+${offset} hours')
            AND datetime(date || ' ' || start_time) > datetime('now', '+${minHours} hours', '+${offset} hours')`;

        const params = [];
        if (targetLocations.length > 0) {
            const placeholders = targetLocations.map(() => '?').join(',');
            query += ` AND LOWER(address) IN (${placeholders})`;
            params.push(...targetLocations.map(loc => loc.toLowerCase()));
        }

        query += ` ORDER BY date, start_time`;

        const stmt = db.prepare(query);
        const outages = stmt.all(...params);

        logger.debug({
            msg: `Queried outages within ${hours} hour(s)`,
            count: outages.length,
            filtered: targetLocations.length > 0
        });

        return outages;
    } catch (error) {
        logger.error({
            msg: `Error getting outages within ${hours} hour(s)`,
            error: error.message,
            stack: error.stack
        });
        return [];
    }
}

export function markAsNotified24h(id) {
    try {
        const stmt = db.prepare(`
            UPDATE outages 
            SET notified_24h = 1, notified_24h_at = datetime('now', 'localtime')
            WHERE id = ?
        `);

        const result = stmt.run(id);

        logger.info({
            msg: "Outage marked as notified (24h)",
            id,
            changed: result.changes
        });

        return result.changes > 0;
    } catch (error) {
        logger.error({
            msg: "Error marking outage as notified (24h)",
            id,
            error: error.message
        });
        return false;
    }
}

export function markAsNotified1h(id) {
    try {
        const stmt = db.prepare(`
            UPDATE outages 
            SET notified_1h = 1, notified_1h_at = datetime('now', 'localtime')
            WHERE id = ?
        `);

        const result = stmt.run(id);
        logger.info({
            msg: "Outage marked as notified (1h)",
            id,
            changed: result.changes
        });

        return result.changes > 0;
    } catch (error) {
        logger.error({
            msg: "Error marking outage as notified (1h)",
            id,
            error: error.message
        });
        return false;
    }
}
