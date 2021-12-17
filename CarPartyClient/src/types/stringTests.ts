const startsWith = <T extends string>(str: string, search: T): str is `${T}${string}` => str.startsWith(search);
const endsWith = <T extends string>(str: string, search: T): str is `${string}${T}` => str.endsWith(search);
const includes = <T extends string>(str: string, search: T): str is `${string}${T}${string}` => str.includes(search);
