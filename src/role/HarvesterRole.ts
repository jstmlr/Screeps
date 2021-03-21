import { ROLES } from "../Constants";
import { Log } from "utils/Log";
import { GenericCreepRole } from "./Role";

export class HarvesterRole extends GenericCreepRole {
    public constructor() {
        super(ROLES.HARVESTER, '#800080');
    }

    public work(creep: Creep): boolean {
        if (creep.spentTurn) return false;

        // See if we were working on something
        if (this.continueAction(creep)) return true;

        // Harvest if we're not full
        if (creep.memory.shouldGetEnergy) return this.harvest(creep);

        // We're full; spend those resources
        if (this.recharge(creep)) return true;
        if (this.build(creep)) return true;
        if (this.upgrade(creep)) return true;

        // TODO: We're full, but can't recharge, build or upgrade.
        // Do something else?
        return false;
    }
}

export const harvesterRole = new HarvesterRole();
