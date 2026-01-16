import { Logger, retry } from "@dev/util";

/**
 * Logs each command and adds retry logic to AWS SDK clients.
 */
export function awsProxy<T extends object>(obj: T): T {
  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "send" && typeof value === "function") {
        return new Proxy(value, {
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          async apply(targetMethod, thisArg, argArray) {
            const command = argArray[0].constructor.name;
            const params = argArray[0].input;
            Logger.debug(`${target.constructor.name}.send called`, {
              command,
              params,
            });
            const result = await retry(() => {
              try {
                Logger.debug(`Executing AWS command`, { command, params });
                const res = Reflect.apply(targetMethod, thisArg, argArray);
                Logger.debug(`AWS command executed`, { command, params });
                return res;
              } catch (e) {
                Logger.error("Error executing AWS command", e);
                throw e;
              }
            });
            Logger.debug(`${target.constructor.name}.send completed`, {
              command,
              params,
              result,
            });
            return result;
          },
        });
      }
      return value;
    },
  };

  return new Proxy(obj, handler);
}
