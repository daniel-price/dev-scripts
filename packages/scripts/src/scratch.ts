import { Logger } from "@dev/util";

import { defineScript } from "./script";

export default defineScript({
  help: () => {
    return `This is a scratch file for testing purposes.`;
  },
  run: async () => {
    Logger.info("This is a scratch file for testing purposes.");
  },
});
