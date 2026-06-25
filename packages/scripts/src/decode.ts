import { Clipboard, Logger, R } from "@dev/util";

import { defineScript } from "./script";

export default defineScript({
  args: {
    string: {
      type: R.String,
      description: "The base64 encoded string to decode.",
    },
  },
  help: () => {
    return `This script decodes a base64 encoded string. Provide the encoded string as an argument using --string. For example: --string SGVsbG8gV29ybGQh`;
  },
  run: async (args) => {
    const decodedString = Buffer.from(args.string, "base64").toString("utf8");

    Clipboard.add(decodedString);

    Logger.info(`Added decoded string to clipboard: ${decodedString}`);
  },
});
