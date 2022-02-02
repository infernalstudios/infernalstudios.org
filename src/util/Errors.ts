export const ERRORS = {
  ENV_NOT_SET: Symbol("ENV_NOT_SET"),
  ENV_INVALID: Symbol("ENV_INVALID"),
};

export const ERROR_KEYS: {
  [key: symbol]: string | ((...args: unknown[]) => string);
} = {
  [ERRORS.ENV_NOT_SET]: envName => `${envName} is not set in .env`,
  [ERRORS.ENV_INVALID]: (envName, allowedValues) =>
    `${envName} is invalid in .env` +
    (allowedValues ? `, allowed values: ${(allowedValues as string[]).join(", ")}` : ""),
};
