import { Logger } from "@dev/util";

export function loggingProxy<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(
      target,
      prop,
      receiver,
    ):
      | (string extends keyof T ? T[keyof T & string] : unknown)
      | (symbol extends keyof T ? T[keyof T & symbol] : unknown) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "send" && typeof value === "function") {
        return new Proxy(value, {
          apply(targetMethod, thisArg, argArray): void {
            const command = argArray[0].constructor.name;
            const params = argArray[0].input;
            Logger.debug(`${target.constructor.name}.send called`, {
              command,
              params,
            });
            return Reflect.apply(targetMethod, thisArg, argArray);
          },
        });
      }
      return value;
    },
  });
}
