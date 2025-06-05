type IsNever<T> = [T] extends [never] ? true : false;

type IsUnion<T, U = T> =
  IsNever<T> extends true
    ? false
    : T extends U
      ? IsNever<Exclude<U, T>> extends true
        ? false
        : true
      : false;

export type SingleKeyObject<T, K = keyof T> =
  IsNever<K> extends true ? never : IsUnion<K> extends true ? never : T;
