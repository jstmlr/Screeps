import { ErrorMapper } from "utils/ErrorMapper"; // wraps loop to correct line numbers
import { GameEngine } from "GameEngine";

GameEngine.globalInit();

export const loop = ErrorMapper.wrapLoop(() => {
    GameEngine.loop();
});
