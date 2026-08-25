import { done, fail, Result } from "lite-fp";

import type { GenerationError } from "./errors";
import type { TypeFormat } from "./types";

/**
 * Import header required by files generated in `-maybe` formats.
 */
export const MAYBE_IMPORT = "import type { Maybe } from 'lite-fp';";

const IDENTIFIER_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * Check whether a {@link TypeFormat} emits `Maybe`-wrapped declarations.
 *
 * @param format - Format to test
 * @returns True for 'asconst-maybe' and 'type-maybe'
 */
export function isMaybeFormat(format: TypeFormat | undefined): boolean {
  return format === "asconst-maybe" || format === "type-maybe";
}

/**
 * Check whether a value is a valid TypeScript identifier.
 *
 * @param value - Value to test
 * @returns True when the value is a valid identifier
 */
export function isValidIdentifier(value: unknown): value is string {
  return typeof value === "string" && IDENTIFIER_RE.test(value);
}

/**
 * Validate an export name (const / enum / type / interface).
 *
 * @param name - Proposed export name
 * @returns Done(name) or Fail with an invalid-name error
 */
export function validateName(name: string): Result<string, GenerationError> {
  return isValidIdentifier(name)
    ? done(name)
    : fail({ $: "invalid-name", name });
}

/**
 * Validate that data is a non-empty array.
 *
 * @param data - Data to validate
 * @returns Done(data) narrowed to unknown[], or Fail
 */
function requireNonEmptyArray(
  data: unknown,
): Result<unknown[], GenerationError> {
  if (!Array.isArray(data)) {
    return fail({ $: "not-array", received: typeof data });
  }
  return data.length > 0 ? done(data) : fail({ $: "empty-data" });
}

/**
 * Generate a typed constant export statement.
 *
 * @param name - Constant name
 * @param type - TypeScript type annotation
 * @param value - Stringified value
 * @returns TypeScript code string for a typed constant export
 */
export function emitTypedConst(
  name: string,
  type: string,
  value: string,
): string {
  return `export const ${name}: ${type} = ${value};`;
}

/**
 * Convert an array of primitive values to a TypeScript enum.
 *
 * String values must be valid TypeScript identifiers to become enum keys;
 * numbers become VALUE_<n> keys. Values that are neither strings nor numbers
 * are filtered out. Fails instead of silently falling back when no valid
 * items remain.
 *
 * @param data - Array of primitive values (strings or numbers)
 * @param enumName - Name for the generated enum
 * @returns Result with the enum definition code, or a GenerationError
 *
 * @example
 * ```typescript
 * const result = generateEnumFromArray(['BTC', 'ETH'], 'Token');
 * // Done: export enum Token { BTC = 'BTC', ETH = 'ETH' }
 * ```
 */
export function generateEnumFromArray(
  data: unknown,
  enumName: string,
): Result<string, GenerationError> {
  return Result.flatMap(
    Result.zip(validateName(enumName), requireNonEmptyArray(data)),
    ([name, items]) => {
      const filtered = items.filter(
        (item) => isValidIdentifier(item) || typeof item === "number",
      );
      return filtered.length === 0
        ? fail({ $: "no-valid-items", format: "enum" })
        : done(`export enum ${name} {\n${entries(filtered).join(",\n")}\n}`);
    },
  );
}

/**
 * Convert an array of primitive values to a TypeScript union type.
 *
 * Creates a union of literal types from string/number elements.
 * Non-primitives are filtered out; fails when nothing valid remains.
 *
 * @param data - Array of primitive values (strings or numbers)
 * @param typeName - Name for the generated type
 * @returns Result with the union type code, or a GenerationError
 *
 * @example
 * ```typescript
 * const result = generateTypeFromArray(['BTCUSDT', 'ETHUSDT'], 'Symbol');
 * // Done: export type Symbol = 'BTCUSDT' | 'ETHUSDT';
 * ```
 */
export function generateTypeFromArray(
  data: unknown,
  typeName: string,
): Result<string, GenerationError> {
  return Result.flatMap(
    Result.zip(validateName(typeName), requireNonEmptyArray(data)),
    ([name, items]) => {
      const literals = items
        .filter((item) => typeof item === "string" || typeof item === "number")
        .map(literal);
      return literals.length === 0
        ? fail({ $: "no-valid-items", format: "type" })
        : done(`export type ${name} = ${literals.join(" | ")};`);
    },
  );
}

/**
 * Convert an array to a TypeScript object with `as const` assertion.
 *
 * Valid identifier strings keep their value as key; other strings use
 * ITEM_<index>; numbers use VALUE_<n>; anything else is JSON-stringified.
 *
 * @param data - Non-empty array of values
 * @param variableName - Name for the generated constant
 * @returns Result with the as-const object code, or a GenerationError
 *
 * @example
 * ```typescript
 * const result = generateAsConstFromArray(['BNB', 'BTC'], 'Token');
 * // Done: export const Token = { BNB: 'BNB', BTC: 'BTC' } as const;
 * ```
 */
export function generateAsConstFromArray(
  data: unknown,
  variableName: string,
): Result<string, GenerationError> {
  return Result.map(
    Result.zip(validateName(variableName), requireNonEmptyArray(data)),
    ([name, items]) => {
      const body = items.map(property).join(",\n");
      return `export const ${name} = {\n${body}\n} as const;`;
    },
  );
}

/**
 * Convert an array to a TypeScript interface.
 *
 * Key rules mirror {@link generateAsConstFromArray}: identifiers keep their
 * name, other strings use ITEM_<index>, numbers use VALUE_<n>, and any other
 * value is JSON-stringified into the property type.
 *
 * @param data - Non-empty array of values
 * @param interfaceName - Name for the generated interface
 * @returns Result with the interface code, or a GenerationError
 *
 * @example
 * ```typescript
 * const result = generateInterfaceFromArray(['BNB', 'BTC'], 'TokenData');
 * // Done: export interface TokenData { BNB: 'BNB'; BTC: 'BTC'; }
 * ```
 */
export function generateInterfaceFromArray(
  data: unknown,
  interfaceName: string,
): Result<string, GenerationError> {
  return Result.map(
    Result.zip(validateName(interfaceName), requireNonEmptyArray(data)),
    ([name, items]) => {
      const body = items
        .map((item, index) => `${property(item, index)};`)
        .join("\n");
      return `export interface ${name} {\n${body}\n}`;
    },
  );
}

/**
 * Convert an array of primitives to a constant annotated as a lite-fp `Maybe`.
 *
 * Emits an explicit readonly annotation — contextual typing preserves the
 * literal types, so no `as const` assertion is needed. Every item must be a
 * string or number; anything else fails (annotation requires type syntax).
 *
 * @param data - Non-empty array of primitive values
 * @param variableName - Name for the generated constant
 * @returns Result with the Maybe-annotated const code, or a GenerationError
 *
 * @example
 * ```typescript
 * const result = generateAsConstMaybeFromArray(['BNB', 'BTC'], 'Token');
 * // Done:
 * // export const Token: Maybe<{
 * //   readonly BNB: 'BNB';
 * //   readonly BTC: 'BTC';
 * // }> = {
 * //   BNB: 'BNB',
 * //   BTC: 'BTC',
 * // };
 * ```
 */
export function generateAsConstMaybeFromArray(
  data: unknown,
  variableName: string,
): Result<string, GenerationError> {
  return Result.flatMap(
    Result.zip(validateName(variableName), requireNonEmptyArray(data)),
    ([name, items]) =>
      Result.map(
        requirePrimitiveArray(items, "asconst-maybe"),
        (primitives) => {
          const fields = primitives.map(maybeField);
          const annotation = fields
            .map((field) => `  readonly ${field.key}: ${field.lit};`)
            .join("\n");
          const value = fields
            .map((field) => `  ${field.key}: ${field.lit}`)
            .join(",\n");
          return `export const ${name}: Maybe<{\n${annotation}\n}> = {\n${value}\n};`;
        },
      ),
  );
}

/**
 * Convert an array of primitives to a union type wrapped in lite-fp's `Maybe`.
 *
 * @param data - Non-empty array of primitive values
 * @param typeName - Name for the generated type
 * @returns Result with the Maybe-wrapped union code, or a GenerationError
 *
 * @example
 * ```typescript
 * const result = generateTypeMaybeFromArray(['BTCUSDT', 'ETHUSDT'], 'Symbol');
 * // Done: export type Symbol = Maybe<'BTCUSDT' | 'ETHUSDT'>;
 * ```
 */
export function generateTypeMaybeFromArray(
  data: unknown,
  typeName: string,
): Result<string, GenerationError> {
  return Result.flatMap(
    Result.zip(validateName(typeName), requireNonEmptyArray(data)),
    ([name, items]) =>
      Result.map(requirePrimitiveArray(items, "type-maybe"), (primitives) => {
        const union = primitives.map(literal).join(" | ");
        return `export type ${name} = Maybe<${union}>;`;
      }),
  );
}

/**
 * Build `KEY = VALUE` enum entry lines from primitive values.
 *
 * @param items - Filtered string/number items
 * @returns Indented enum entries without separators
 */
function entries(items: (string | number)[]): string[] {
  return items.map((item) => {
    if (typeof item === "string") {
      return `  ${item} = ${literal(item)}`;
    }
    return `  VALUE_${item} = ${item}`;
  });
}

/**
 * Render a primitive as a TypeScript literal.
 *
 * @param item - String or number value
 * @returns Quoted literal for strings, raw text for numbers
 */
function literal(item: string | number): string {
  return typeof item === "string"
    ? `'${item.replace(/'/g, "\\'")}'`
    : String(item);
}

/**
 * Require every item to be a string or a number.
 *
 * Unlike enum/type filtering, one invalid item fails the whole operation:
 * `-maybe` formats need valid type syntax for every entry.
 *
 * @param items - Array items to check
 * @param format - Format reported in the failure
 * @returns Done(primitives) or Fail(no-valid-items)
 */
function requirePrimitiveArray(
  items: unknown[],
  format: TypeFormat,
): Result<(string | number)[], GenerationError> {
  const isPrimitive = (item: unknown): item is string | number =>
    typeof item === "string" || typeof item === "number";
  return items.every(isPrimitive)
    ? done(items)
    : fail({ $: "no-valid-items", format });
}

/**
 * Derive the property key for an array item.
 *
 * Valid identifier strings keep their value as key; other strings use
 * ITEM_<index>; numbers use VALUE_<n>; anything else uses ITEM_<index>.
 *
 * @param item - Any value from the source array
 * @param index - Position of the item in the source array
 * @returns The derived property key
 */
function keyFor(item: unknown, index: number): string {
  if (typeof item === "string") {
    return isValidIdentifier(item) ? item : `ITEM_${index}`;
  }
  if (typeof item === "number") {
    return `VALUE_${item}`;
  }
  return `ITEM_${index}`;
}

/**
 * Build one annotation/value field pair for a primitive item.
 *
 * @param item - String or number value
 * @param index - Position of the item in the source array
 * @returns Key and literal text shared by annotation and initializer
 */
function maybeField(
  item: string | number,
  index: number,
): { key: string; lit: string } {
  return { key: keyFor(item, index), lit: literal(item) };
}

/**
 * Render an item as a `key: value` property fragment (no semicolon).
 *
 * @param item - Any value from the source array
 * @param index - Position of the item in the source array
 * @returns Property text such as `BTC: 'BTC'`
 */
function property(item: unknown, index: number): string {
  if (typeof item === "string") {
    return `  ${keyFor(item, index)}: ${literal(item)}`;
  }
  if (typeof item === "number") {
    return `  VALUE_${item}: ${item}`;
  }
  return `  ITEM_${index}: ${JSON.stringify(item)}`;
}
