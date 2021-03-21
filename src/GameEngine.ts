import { MemoryManager } from "MemoryManager";
import { CreepManager } from "CreepManager";
import { Log } from "utils/Log";

export namespace GameEngine {
    export function globalInit() {
        //Log.setLogLevel(Log.LOGLEVEL.DEBUG)
    }

    export function loop() {
        MemoryManager.cleanupMemory();
        MemoryManager.loadMemory();
        CreepManager.loadCreeps();
        Log.debug(`Current game tick is ${Game.time}`);

        // TODO: add RoomManager -> SpawnManager -> CreepManager(spawn)
        _.forEach(Game.spawns, spawn => {
            CreepManager.spawnCreepsIfNeeded(spawn);
        });

        CreepManager.loadCreeps();
        CreepManager.doWork();
    }
}
