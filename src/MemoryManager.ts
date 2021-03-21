export namespace MemoryManager {
  var memory: Memory;

  export function cleanupMemory(): void {
    // Delete memory of nonexistent creeps
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        // TODO: Decide whether reuse or a callback for important info is necessary
        delete Memory.creeps[name];
        console.log('Clearing non-existing creep memory:', name);
      }
    }
  }

  export function loadMemory(): void {
    memory = Memory;
  }
}
