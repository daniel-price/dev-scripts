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
          apply(targetMethod, thisArg, argArray) {
            const command = argArray[0].constructor.name;
            const params = argArray[0].input;
            Logger.debug(`${target.constructor.name}.send called`, {
              command,
              params,
            });
            return retry(() => Reflect.apply(targetMethod, thisArg, argArray));
          },
        });
      }
      return value;
    },
  };

  return new Proxy(obj, handler);
}
