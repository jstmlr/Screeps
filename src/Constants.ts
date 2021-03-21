export enum ROLES {
    HARVESTER = 'Harvester',
    BUILDER = 'Builder',
    UPGRADER = 'Upgrader',
}

export const ROLE_INFO = {
    'Harvester': {
        name: 'Harvester',
        bodyParts: [WORK, CARRY, MOVE, MOVE],
        targetAmount: 3,
    },
    'Builder': {
        name: 'Builder',
        bodyParts: [WORK, CARRY, MOVE, MOVE],
        targetAmount: 1,
    },
    'Upgrader': {
        name: 'Upgrader',
        bodyParts: [WORK, CARRY, MOVE, MOVE],
        targetAmount: 1,
    },
}

export enum JOBS {
    FREE = '',
    HARVEST = 'Harvest',
    RECHARGE = 'Recharge',
    BUILD = 'Build',
    UPGRADE = 'Upgrade',
    DIE = 'Die',
}
