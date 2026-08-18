// DTO interfaces describing the wire contract. Each backend DTO class declares
// `implements` against the interface here, so changing one without the other is
// a compile error rather than a runtime surprise the frontend discovers later.
export * from './common';
export * from './cohorts';
