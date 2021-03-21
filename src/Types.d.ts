// Extensions to Memory interfaces
interface CreepMemory {
    shouldGetEnergy?: boolean;
    currentConstructionSiteId?: Id<ConstructionSite>;
    currentResourceId?: Id<Source> | Id<StructureLink> | Id<StructureStorage> | Id<StructureContainer> | Id<Resource<ResourceConstant>>;
    currentRechargeId?: Id<Structure>;
    spawnRoom?: string;
    pathBlocked?: number;
}

interface RoomMemory {
    // Stuff
}

interface Creep {
    spentTurn?: boolean;
}
