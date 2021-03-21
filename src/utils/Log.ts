export namespace Log {
    export enum LOGLEVEL {
        TRACE = 5,
        DEBUG = 4,
        INFO = 3,
        WARN = 2,
        ERROR = 1,
    }

    var logLevel: LOGLEVEL = LOGLEVEL.INFO;

    export function setLogLevel(level: LOGLEVEL) {
        logLevel = level;
    }

    export function trace(message: string, creep?: Creep): void { log(LOGLEVEL.TRACE, message, creep); }
    export function debug(message: string, creep?: Creep): void { log(LOGLEVEL.DEBUG, message, creep); }
    export function  info(message: string, creep?: Creep): void { log( LOGLEVEL.INFO, message, creep); }
    export function  warn(message: string, creep?: Creep): void { log( LOGLEVEL.WARN, message, creep); }
    export function error(message: string, creep?: Creep): void { log(LOGLEVEL.ERROR, message, creep); }

    function log(level: LOGLEVEL, message: string, creep?: Creep) {
        if (level as number <= logLevel) {
            let msg = message;
            if (creep) {
                msg = `${creep} at ${creep.pos} - ${message}`
            }
            console.log(`${logLevelToString(level)} - ${msg}`);
        }
    }

    function logLevelToString(level: LOGLEVEL): string {
        switch (level) {
            case LOGLEVEL.TRACE: {
                return "TRACE";
            }
            case LOGLEVEL.DEBUG: {
                return "DEBUG";
            }
            case LOGLEVEL.INFO: {
                return " INFO";
            }
            case LOGLEVEL.WARN: {
                return " WARN";
            }
            case LOGLEVEL.ERROR: {
                return "ERROR";
            }
        }
    }
}
