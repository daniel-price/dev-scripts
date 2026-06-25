import { R } from "@dev/util";

import { type ArgField, clipboard } from "./args";
import { defineScript } from "./script";

type RequiredStringField = ArgField<typeof R.String>;
type OptionalBooleanField = ArgField<ReturnType<typeof R.Boolean.optional>>;

const requiredWithDefault: RequiredStringField = {
  type: R.String,
  // @ts-expect-error default not allowed on required args
  default: 1,
};

const optionalWithWrongDefault: OptionalBooleanField = {
  type: R.Boolean.optional(),
  // @ts-expect-error default must match underlying runtype
  default: 1,
};

const optionalWithCorrectDefault: OptionalBooleanField = {
  type: R.Boolean.optional(),
  default: false,
};

const requiredWithClipboard: RequiredStringField = {
  type: R.String,
  default: clipboard,
};

void requiredWithDefault;
void requiredWithClipboard;
void optionalWithWrongDefault;
void optionalWithCorrectDefault;

defineScript({
  args: {
    // @ts-expect-error default not allowed on required args
    name: {
      type: R.String,
      default: 1,
    },
  },
  run: async () => {},
});

defineScript({
  args: {
    // @ts-expect-error default must match underlying runtype
    flag: {
      type: R.Boolean.optional(),
      default: 1,
    },
  },
  run: async () => {},
});

defineScript({
  args: {
    flag: { type: R.Boolean.optional(), default: false },
  },
  run: async () => {},
});

defineScript({
  args: {
    input: { type: R.String, default: clipboard },
  },
  run: async () => {},
});

defineScript({
  args: {
    // @ts-expect-error clipboard default is only allowed on required string args
    flag: { type: R.Boolean.optional(), default: clipboard },
  },
  run: async () => {},
});

defineScript({
  args: {
    // @ts-expect-error unknown arg field keys are not allowed
    name: {
      type: R.String,
      shouldntBeAllowed: false,
    },
  },
  run: async () => {},
});

defineScript({
  // @ts-expect-error only one argument may use default: clipboard
  args: {
    input: { type: R.String, default: clipboard },
    flag: { type: R.String, default: clipboard },
  },
  run: async () => {},
});

defineScript({
  // @ts-expect-error multiple args may not have the same short flag
  args: {
    input: { type: R.String, short: "i" },
    input2: { type: R.String, short: "i" },
  },
  run: async () => {},
});

defineScript({
  args: {
    input: { type: R.String, short: "i" },
  },
  run: async () => {},
});

defineScript({
  args: {
    // @ts-expect-error short flag must be a single character
    input: { type: R.String, short: "in" },
  },
  run: async () => {},
});
