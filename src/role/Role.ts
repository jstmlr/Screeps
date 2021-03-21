import { JOBS, ROLES } from "../Constants";
import { ColorUtils } from "utils/Color";
import { Log } from "utils/Log";

/**
 * Generic abstract creep role, contains shared logic to be used by specialized
 * classes.
 *
 * @export
 * @class GenericCreepRole
 */
export abstract class GenericCreepRole {
    private role: ROLES;
    private colorPalette: string;

    protected constructor(role: ROLES, palette: string) {
        this.role = role;
        this.colorPalette = palette;
    }

    /**
     * Returns `true` if the provided creep is of this role.
     *
     * @param {Creep} creep the creep to check
     * @return {boolean} true if the provided creep is of this role
     */
    public isCreepOfRole(creep: Creep): boolean {
        return creep.name.startsWith(this.role);
    }

    /**
     * Run the creep's logic, to be implemented by specialized roles.
     *
     * @param {Creep} creep
     * @return {boolean}
     */
    public abstract work(creep: Creep): boolean;

    /**
     * Instructs creep to travel to the specified target, using an optional line color if provided.
     *
     * @param {Creep} creep the creep to move
     * @param {(RoomPosition | StructureStorage | StructureContainer | StructureLink | Source | Resource<ResourceConstant>)} target where to move
     * @param {string} [color] overrides the color of the line to draw
     * @returns {(number | undefined)} returns `undefined` if busy, the return value of `creep.moveTo()` otherwise
     */
    public travelTo(
        creep: Creep,
        target: RoomPosition | StructureStorage | StructureContainer | StructureLink | Source | Resource<ResourceConstant>,
        color?: string
    ): number | undefined {
        const opts: MoveToOpts = {};

        if (creep.spentTurn) return;

        if (color) {
            opts.visualizePathStyle = { stroke: color, opacity: 1, lineStyle: 'dotted' };
        } else {
            opts.visualizePathStyle = { stroke: this.colorPalette, opacity: 1, lineStyle: 'dotted' };
        }

        let status = creep.moveTo(target, opts);
        if (status === ERR_NO_PATH) {
            if (creep.memory.pathBlocked) creep.memory.pathBlocked++
            else creep.memory.pathBlocked = 1
            creep.say(`No path (${creep.memory.pathBlocked})`);

            return status;
        }

        if (status === OK || status === ERR_TIRED) {
            if (status === OK && creep.memory.pathBlocked) delete creep.memory.pathBlocked;
            creep.spentTurn = true;
            return OK;
        } else if (status === ERR_NO_BODYPART) {
            Log.info(`No bodypart for moving, suiciding..`, creep);
            creep.suicide();
        }
        return status;
    }

    /**
     * Harvest with this creep (not using links, not picking up dropped resources, not picking up from storage)
     *
     * @param {Creep} creep the creep to control
     * @returns {boolean} returns `true` if this creep started an action and shouldn't be processed further
     */
    public harvest(creep: Creep): boolean {
        return this.getEnergy(creep, false, false, false)
    }

    /**
     * Acquire energy through various means, controllable through parameters.
     *
     * @param {Creep} creep the creep to control
     * @param {boolean} useLinks allow getting resources from links
     * @param {boolean} pickupDropped allow picking up dropped resources
     * @param {boolean} fromStorage allow getting resources from storage
     * @returns {boolean} returns `true` if this creep started an action and shouldn't be processed further
     */
    public getEnergy(
        creep: Creep,
        useLinks: boolean,
        pickupDropped: boolean,
        fromStorage: boolean,
        ignoreSource?: Id<StructureLink> | Id<StructureStorage> | Id<StructureContainer> | Id<Source> | Id<Resource<ResourceConstant>>
    ): boolean {
        let source: StructureLink | StructureStorage | StructureContainer | Source | Resource<ResourceConstant> | undefined | null;

        if (creep.spentTurn) return true;

        if (creep.memory.currentResourceId) {
            if (ignoreSource && ignoreSource == creep.memory.currentResourceId) {
                delete creep.memory.currentResourceId;
            } else {
                source = Game.getObjectById<StructureStorage | StructureContainer | Source>(creep.memory.currentResourceId);
            }
        }

        if (!source) {
            if (!source && pickupDropped) {
                source = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                    filter: s => s.resourceType == RESOURCE_ENERGY && !(ignoreSource && s.id == ignoreSource)
                });
            }

            source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_CONTAINER || (fromStorage && s.structureType == STRUCTURE_STORAGE))
                    && s.store.getUsedCapacity() > 100
                    && !(ignoreSource && s.id == ignoreSource)
            }) as StructureContainer;

            if (!source) {
                source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE, {
                    filter: s => !(ignoreSource && s.id == ignoreSource)
                }) as Source;
            }
        }
        if (source) {
            creep.memory.currentResourceId = source.id;
            let status;

            if (source instanceof Source) {
                status = creep.harvest(source);
            } else if (source instanceof Structure) {
                status = creep.withdraw(source, RESOURCE_ENERGY);
            } else if (source instanceof Resource) {
                creep.pickup(source)
            } else {
                Log.error(`Source ${source} is of an unknown type!`, creep)
            }

            // Check if we filled up creep storage
            if (creep.store.getFreeCapacity() == 0) creep.memory.shouldGetEnergy = false;

            if (status === OK) {
                creep.spentTurn = true;
                return true;
            } else if (status === ERR_NOT_IN_RANGE) {
                status = this.travelTo(creep, source, ColorUtils.colorForAction(this.colorPalette, JOBS.HARVEST));
                if (status === OK) return true;
                if (status === ERR_NO_PATH && creep.memory.pathBlocked && creep.memory.pathBlocked >= 5) {
                    // Call ourselves again, but ignore this source
                    Log.info('Blocked - Finding different resource', creep)
                    return this.getEnergy(creep, useLinks, pickupDropped, fromStorage, source.id)
                }
            } else if (status === ERR_NOT_FOUND) {
                //...
            } else if (status === ERR_NOT_ENOUGH_RESOURCES) {
                delete creep.memory.currentResourceId;
                Log.info('Resource tapped - Finding different resource', creep)
                return this.getEnergy(creep, useLinks, pickupDropped, fromStorage, source.id)
            } else if (status === ERR_NO_BODYPART) {
                this.suicide(creep, 'No bodypart for carrying');
            }
        } else {
            creep.say('No sources found');
            Log.info(`No sources found`, creep);
        }
        return false;
    }

    /**
     * Find and recharge a structure
     *
     * @param {Creep} creep
     * @param {Id<Structure>} [specificStructure]
     * @returns {*}  {boolean}
     */
    public recharge(creep: Creep, specificStructure?: Id<Structure>): boolean {
        let structure: Structure | undefined | null;

        if (specificStructure) {
            structure = Game.getObjectById<Structure>(specificStructure);

            if (structure
                && (structure instanceof StructureSpawn
                    || structure instanceof StructureExtension
                    || structure instanceof StructureTower)
                && structure.store.getFreeCapacity() == 0) {
                structure = undefined;
                return false;
            }
        }

        if (!structure) {
            structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: s => {
                    return (
                        (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_SPAWN) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    );
                }
            }) as StructureExtension | StructureSpawn;

            // Check structureType STRUCTURE_TOWER and STRUCTURE
            if (!structure) {
                // if things do not need to be recharged, fill up storage.
                structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                }) as StructureTower;
            }
        }

        if (structure) {
            creep.memory.currentRechargeId = structure.id;
            const status = creep.transfer(structure, RESOURCE_ENERGY);
            if (status === OK) {
                creep.spentTurn = true;
                return true;
            } else if (status === ERR_NOT_IN_RANGE) {
                this.travelTo(creep, structure.pos, ColorUtils.colorForAction(this.colorPalette, JOBS.RECHARGE));
                return true;
            } else if (status === ERR_FULL) {
                delete creep.memory.currentRechargeId;
            } else {
                delete creep.memory.currentRechargeId;
            }
        }
        return false;
    }

    public upgrade(creep: Creep): boolean {
        let controller = creep.room.controller;
        if (controller && creep.memory.spawnRoom && controller.room.name !== creep.memory.spawnRoom) {
            controller = Game.rooms[creep.memory.spawnRoom].controller;
        }
        if (!controller) {
            console.log(`${creep.name} cannot find its controller. Assigned to ${creep.memory.spawnRoom}.`);
            return false;
        }
        if (!controller.my) {
            console.log(`${creep.name} attempting to upgrade at a controller not owned by us!`);
            return false;
        }
        const status = creep.upgradeController(controller);

        if (status === OK) {
            creep.spentTurn = true;
            return true;
        } else if (status === ERR_NOT_IN_RANGE) {
            this.travelTo(creep, controller.pos, ColorUtils.colorForAction(this.colorPalette, JOBS.UPGRADE));
            return true;
        } else if (status === ERR_NOT_OWNER) {
            Log.info(`${creep.name} is lost in ${creep.room.name}`);
        } else if (status === ERR_NO_BODYPART) {
            this.suicide(creep, 'No bodypart for upgrading');
        }
        return false;
    }

    public build(creep: Creep, specificSite?: Id<ConstructionSite>): boolean {
        let buildTarget: ConstructionSite | undefined | null;

        if (specificSite) {
            buildTarget = Game.getObjectById<ConstructionSite>(specificSite);
            if (!buildTarget) {
                // This site is not available anymore, pass
                return false;
            }
        }

        // Find a new construction site to start working on
        if (!buildTarget) {
            buildTarget = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
        }

        if (buildTarget) {
            creep.memory.currentConstructionSiteId = buildTarget.id;

            const status = creep.build(buildTarget);

            if (status === OK) {
                creep.spentTurn = true;
                return true;
            } else if (status === ERR_NOT_IN_RANGE) {
                this.travelTo(creep, buildTarget.pos, ColorUtils.colorForAction(this.colorPalette, JOBS.BUILD));
                return true;
            } else if (status === ERR_INVALID_TARGET) {
                delete creep.memory.currentConstructionSiteId;
            } else if (status === ERR_NO_BODYPART) {
                this.suicide(creep, 'No bodypart for building');
            }
        }
        return false;
    }
    protected continueAction(creep: Creep): boolean {
        if (creep.memory.currentResourceId) {
            if (creep.store.getFreeCapacity() != 0) {
                if (this.harvest(creep)) {
                    return true;
                }
            }
            delete creep.memory.currentResourceId;
        }
        if (creep.memory.currentConstructionSiteId) {
            if (creep.store.energy != 0) {
                if (this.build(creep, creep.memory.currentConstructionSiteId)) {
                    return true
                }
            }
            delete creep.memory.currentConstructionSiteId;
        }
        if (creep.memory.currentRechargeId) {
            if (creep.store.energy != 0) {
                if (this.recharge(creep, creep.memory.currentRechargeId)) {
                    return true;
                }
            }
            delete creep.memory.currentRechargeId;
        }

        return false;
    }

    protected suicide(creep: Creep, message?: string) {
        const msg = (message ? `${message} - ` : '') + 'Suiciding..'
        creep.say(msg);
        Log.info(msg, creep);
        creep.spentTurn = true;
    }
}
