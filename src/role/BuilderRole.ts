import { ROLES } from "../Constants";
import { Log } from "utils/Log";
import { GenericCreepRole } from "./Role";

export class BuilderRole extends GenericCreepRole {
    public constructor() {
        super(ROLES.BUILDER, '#000080');
    }

    public work(creep: Creep): boolean {
        if (creep.spentTurn) return false;

        // See if we were working on something
        if (this.continueAction(creep)) return true;

        // Get energy if we're not full
        if (creep.memory.shouldGetEnergy) return this.getEnergy(creep, true, true, true);

        // We're full; spend those resources
        if (this.build(creep)) return true;
        if (this.upgrade(creep)) return true;
        if (this.recharge(creep)) return true;

        return false;
    }
}

export const builderRole = new BuilderRole();
