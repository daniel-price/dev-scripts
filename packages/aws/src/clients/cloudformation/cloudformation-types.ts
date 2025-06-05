import { R } from "@dev/util";

export const G_Stack = R.Record({
  StackName: R.String,
  StackStatus: R.String,
});

export type T_Stack = R.Static<typeof G_Stack>;

export type T_StackBatch = Array<T_Stack>;
