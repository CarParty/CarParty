export const startsWith = <T extends string>(str: string, search: T): str is `${T}${string}` => str.startsWith(search);
export const endsWith = <T extends string>(str: string, search: T): str is `${string}${T}` => str.endsWith(search);
export const includes = <T extends string>(str: string, search: T): str is `${string}${T}${string}` => str.includes(search);

export const hasOwnProperty = <X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> => obj.hasOwnProperty(prop);
