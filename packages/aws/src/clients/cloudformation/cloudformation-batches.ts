import { StackStatus } from "@aws-sdk/client-cloudformation";
import { ChangeItems, Logger, Util } from "@dev/util";

import { isSdkError } from "../../helpers/error";
import {
  deleteStack,
  describeStack,
  describeStackEvents,
} from "./cloudformation";
import { T_Stack, T_StackBatch } from "./cloudformation-types";

export class Batches {
  private _stacksBatches: Array<StackBatch>;
  constructor(stacksBatches: Array<T_StackBatch>) {
    this._stacksBatches = stacksBatches.map((sb) => new StackBatch(sb));
  }

  public async deleteAll(): Promise<boolean> {
    const description = "delete stack";
    await ChangeItems.confirmChangeItems(
      description,
      this._stacksBatches.map((stackBatch) =>
        stackBatch.stacks.map((s: Stack) => s.StackName),
      ),
    );

    const frames = ["-", "\\", "|", "/"];
    let index = 0;
    const interval = setInterval(() => {
      index++;
      const frameIndex = index % frames.length;
      const frame = frames[frameIndex];

      let logText = "";
      for (const stackBatch of this._stacksBatches) {
        for (const stack of stackBatch.stacks) {
          switch (stack.status) {
            case STATUS.DONE:
              logText += ` ✓ ${stack.StackName}: ${stack.StackStatus}\n`;
              break;
            case STATUS.PROCESSING:
              logText += ` ${frame} ${stack.StackName}: ${stack.StackStatus}\n`;
              break;
            case STATUS.WAITING:
              logText += ` - ${stack.StackName}: ${stack.StackStatus}\n`;
              break;
            case STATUS.FAILED:
              logText += ` ✕ ${stack.StackName}: ${stack.StackStatus}\n`;
              break;
          }
        }
      }

      void import("log-update").then(({ default: logUpdate }) =>
        logUpdate(logText),
      );
    }, 80);

    let success = false;
    for (const stackBatch of this._stacksBatches) {
      success = await stackBatch.deleteBatch();
      if (!success) break;
    }

    await Util.sleep(100);

    clearInterval(interval);
    void import("log-update").then(({ default: logUpdate }) =>
      logUpdate.done(),
    );

    if (!success) return false;

    return true;
  }
}

class StackBatch {
  private _stacks: Array<Stack>;
  constructor(stacks: Array<T_Stack>) {
    this._stacks = stacks.map(
      (s) => new Stack(s.StackName, s.StackStatus as T_StackStatus),
    );
  }

  public async deleteBatch(): Promise<boolean> {
    const results = await Promise.all(this._stacks.map((s) => s.delete()));
    return results.every((r) => r === true);
  }

  get stacks(): Array<Stack> {
    return this._stacks;
  }
}

enum STATUS {
  PROCESSING = 0,
  DONE = 1,
  WAITING = 2,
  FAILED = 3,
}

type T_StackStatus = StackStatus | "Unknown - throttled" | "Unknown";

class Stack {
  private _status = STATUS.WAITING;
  private _stackStatuses: Array<T_StackStatus>;
  constructor(
    private _stackName: string,
    stackStatus: T_StackStatus,
  ) {
    this._stackStatuses = [stackStatus];
  }

  public async delete(): Promise<boolean> {
    const startTime = new Date().getTime();
    this._status = STATUS.PROCESSING;
    await deleteStack(this._stackName);

    const success = await this.waitForDone();
    if (!success) {
      const events = await describeStackEvents(this._stackName);
      const errorMessage = events.StackEvents?.filter(
        (s) =>
          ["DELETE_FAILED", "UPDATE_ROLLBACK_FAILED"].includes(
            s.ResourceStatus || "",
          ) &&
          s.Timestamp &&
          s.Timestamp.getTime() > startTime,
      )
        .map(
          (s) =>
            `${s.StackName} ${s.ResourceStatus}: ${s.ResourceStatusReason}`,
        )
        .join("\n");

      //Debug lack of error messsage..
      if (!errorMessage?.trim().length) {
        Logger.info({ events });
        Logger.error("No error message found in stack events.");
      }

      Logger.info("STACK EVENT:", errorMessage);
    }
    return success;
  }

  private async waitForDone(): Promise<boolean> {
    await this._updateStatuses();
    while (
      this._stackStatuses.filter(
        (s) => s !== "Unknown - throttled" && s !== "Unknown",
      ).length === 1 ||
      this.inProgress()
    ) {
      await Util.sleep(10000);
      await this._updateStatuses();
    }

    if (this.failed()) {
      this._status = STATUS.FAILED;
      return false;
    }

    this._status = STATUS.DONE;

    await this._updateStatuses();
    return true;
  }

  private failed(): boolean {
    return this.StackStatus.endsWith("_FAILED");
  }

  private inProgress(): boolean {
    return (
      this.StackStatus.endsWith("_IN_PROGRESS") ||
      this.StackStatus === "Unknown - throttled"
    );
  }

  get status(): STATUS {
    return this._status;
  }

  get StackName(): string {
    return this._stackName;
  }

  get StackStatus(): string {
    return this._stackStatuses[this._stackStatuses.length - 1];
  }

  private async _updateStatuses(): Promise<void> {
    const latestStatus = await this._getLatestStatus();
    if (this.StackStatus !== latestStatus)
      this._stackStatuses.push(latestStatus);
  }

  private async _getLatestStatus(): Promise<T_StackStatus> {
    try {
      const res = await describeStack(this._stackName);

      const stackStatus = res.Stacks?.[0].StackStatus;
      if (!stackStatus) {
        Logger.info({ res });
        throw new Error("Unable to get StackStatus");
      }

      return stackStatus as T_StackStatus;
    } catch (e) {
      if (e instanceof Error && e.message.includes("does not exist")) {
        return StackStatus.DELETE_COMPLETE;
      }

      if (isSdkError(e) && e.Code === "Throttling") {
        return "Unknown - throttled";
      }

      Logger.error("error getting latest status", e);
    }

    return "Unknown";
  }
}
