import { ROLES, ROLE_INFO } from "./Constants";
import { Log } from "utils/Log";
import { harvesterRole } from "role/HarvesterRole";
import { builderRole } from "role/BuilderRole";
import { upgraderRole } from "role/UpgraderRole";

export namespace CreepManager {
    var creepCache: typeof Game.creeps;

    export function loadCreeps(): void {
        creepCache = Game.creeps;
    }

    function getCurrentNumberOfCreepsOfRole(role: ROLES) {
        return _.filter(creepCache, creep => (creep.name.startsWith(role))).length
    }

    export function doWork(): void {
        Object.values(creepCache).forEach(creep => {
            if (creep.spawning) return;
            if (prepareCreep(creep)) return;

            if (harvesterRole.isCreepOfRole(creep)) harvesterRole.work(creep)
            if (builderRole.isCreepOfRole(creep)) builderRole.work(creep)
            if (upgraderRole.isCreepOfRole(creep)) upgraderRole.work(creep)
        });
    }

    /**
     * Check TTL and tidy up creep memory to represent current situation.
     * To be called before `run()`.
     *
     * @param {Creep} creep
     * @returns {boolean} returns `true` if creep is dying and shouldn't be processed further
     */
    function prepareCreep(creep: Creep): boolean {
        if (creep.ticksToLive && creep.ticksToLive <= 1) {
            creep.say('Dying -- dropping resources');
            for (const resourceType in creep.store) {
                creep.drop(resourceType as ResourceConstant);
            }
            Log.info('Dying -- dropping resources', creep);
            delete Memory.creeps[creep.name];
            return true;
        }

        // Screep may be new; check for missing values
        if (!creep.memory.spawnRoom) {
            creep.memory.spawnRoom = creep.room.name;
        }

        // Check if we are spending energy but are since tapped
        if (!creep.memory.shouldGetEnergy && creep.store.energy === 0) {
            creep.memory.shouldGetEnergy = true;

            // Find something new to recharge when we're full
            delete creep.memory.currentRechargeId;
        }

        // Check if we are getting energy but have since filled up
        if (creep.memory.shouldGetEnergy && creep.store.getFreeCapacity() == 0) {
            creep.memory.shouldGetEnergy = false;

            // Find a new source when we're spent
            delete creep.memory.currentResourceId;
        }
        return false;
    }

    /**
     * Spawn creeps with specific roles up to the specified desired amount in `ROLE_INFO`.
     *
     * @param {StructureSpawn} spawn the spawn used to spawn the creeps
     */
    export function spawnCreepsIfNeeded(spawn: StructureSpawn): void {
        if (spawn.spawning) {
            return;
        }

        for (const r in ROLE_INFO) {
            const role = r as ROLES;
            const roleInfo = ROLE_INFO[role];
            if (roleInfo.targetAmount > getCurrentNumberOfCreepsOfRole(role)) {
                const projectedCost: number = roleInfo.bodyParts.reduce((count, bodyPart) => {
                    return count + BODYPART_COST[bodyPart]
                }, 0);

                if (spawn.room.energyAvailable < projectedCost) {
                    Log.debug(`[Spawn] Not enough energy to spawn creep for role ${role}; cost ${projectedCost}/${spawn.room.energyAvailable}`)
                    return;
                }
                Log.debug(`[Spawn] Attempting creep spawn for role ${role}; cost ${projectedCost}/${spawn.room.energyAvailable}`)
                spawnCreepWithRole(role, spawn);
            } else {
                Log.debug(`[Spawn] Not spawning anything for ${role}; amount ${getCurrentNumberOfCreepsOfRole(role)}/${roleInfo.targetAmount}`)
            }
        }
    }

    /**
     * Spawn a creep at `spawn` with the role specified by `role`.
     * The body parts to use will be retrieved from ROLES_INFO.
     * The name of the creep will be the `role` appended by the game tick time, optionally
     * appended with an index if two happen to spawn at the same tick.
     *
     * @param {ROLES} role which role to spawn
     * @param {StructureSpawn} spawn the spawn used to spawn the creep
     * @returns {number} the `ScreepsReturnCode` for `.spawnCreep()`
     */
    function spawnCreepWithRole(role: ROLES, spawn: StructureSpawn): ScreepsReturnCode {
        let [bodyParts, name, opts] = getSpawnParametersForRole(role, spawn, true);

        var status = spawn.spawnCreep(bodyParts, name, opts);
        if (status != OK) return status;

        opts['dryRun'] = false;
        status = spawn.spawnCreep(bodyParts, name, opts);
        if (status != 0) {
            Log.warn(`Spawn unexpectedly failed with error ${status} for creep: ${name}`)
            return status;
        } else {
            Log.info(`Spawning creep called ${name} with body: ${JSON.stringify(bodyParts)}`)
        }
        return status;
    }

    /**
     * Returns configured body parts for the specified role.
     *
     * @param {ROLES} role
     * @returns {BodyPartConstant[]}
     */
    function getBodyPartsForRole(role: ROLES): BodyPartConstant[] {
        return ROLE_INFO[role].bodyParts;
    }

    /**
     * Generates parameters to be used in `.spawnCreep()`.
     *
     * @param {ROLES} role
     * @param {StructureSpawn} spawn
     * @param {boolean} dry set value for dry run
     * @returns {[BodyPartConstant[], string, SpawnOptions]}
     */
    function getSpawnParametersForRole(role: ROLES, spawn: StructureSpawn, dry: boolean): [BodyPartConstant[], string, SpawnOptions] {
        let bodyparts: BodyPartConstant[] = getBodyPartsForRole(role);
        const name: string = getNewScreepNameForRole(role);
        const opts: SpawnOptions = {
            dryRun: dry,
            energyStructures: [spawn],
        };
        return [bodyparts, name, opts];
    }

    /**
     * Generates a unique name for the specified role.
     *
     * @param {ROLES} role
     * @returns {string}
     */
    function getNewScreepNameForRole(role: ROLES): string {
        var success = false;
        var retry = 0
        var name = ''
        while (!success && retry <= 5) {
            const suffix = retry == 0 ? '' : (`_${retry}`)
            name = `${role.toString()}_${Game.time.toString()}${suffix}`;
            if (!creepCache[name]) {
                Log.debug(`[Spawn] name available: ${name}`);
                success = true;
            } else {
                Log.debug(`[Spawn] name unavailable: ${name}`);
            }
            ++retry;
        }
        return name
    }
}
