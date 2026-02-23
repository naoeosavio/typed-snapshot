import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { TypeFormat, WriteTypedVariableOptions } from "./types";

/**
 * Generate and write a TypeScript file with typed exports.
 *
 * This function creates a TypeScript file containing typed constants, enums,
 * union types, `as const` objects, or interfaces based on the provided data.
 *
 * @param options - Configuration options for file generation
 * @param options.type - TypeScript type annotation for the exported constant
 * @param options.data - Data to serialize to the file
 * @param options.variableName - Name of the constant/enum/type/interface to export
 * @param options.outputPath - File path where the TypeScript file will be written
 * @param options.importPath - Optional path for type imports
 * @param options.importTypeName - Optional type name to import
 * @param options.includeTimestamp - Whether to include a timestamp comment (default: true)
 * @param options.typeFormat - Format for array data: 'plain', 'enum', 'type', 'asconst', or 'interface' (default: 'plain')
 *
 * @returns A Promise that resolves when the file has been written
 *
 * @example
 * ```typescript
 * await writeTypedVariableToFile({
 *   type: '{ base: string; total: number }',
 *   data: { base: 'USDT', total: 123.4567 },
 *   variableName: 'PORTFOLIO_SALDO',
 *   outputPath: './data/portfolio_saldo.ts',
 *   includeTimestamp: true,
 * });
 * ```
 */
/**
 * Generate the complete TypeScript file content.
 *
 * @param type - TypeScript type annotation
 * @param data - Data to serialize
 * @param variableName - Name for the export
 * @param importPath - Optional import path
 * @param importTypeName - Optional import type name
 * @param includeTimestamp - Whether to include timestamp
 * @param typeFormat - Format for the output
 * @returns Complete TypeScript file content as string
 */
function generateContent(
  type: string,
  data: unknown,
  variableName: string,
  importPath?: string,
  importTypeName?: string,
  includeTimestamp: boolean = true,
  typeFormat: TypeFormat = "plain",
): string {
  const parts: string[] = ["// Auto-generated file – DO NOT EDIT"];

  if (includeTimestamp) {
    parts.push(`// Last updated: ${new Date().toISOString()}`);
  }

  if (importPath && importTypeName) {
    parts.push(`import type { ${importTypeName} } from '${importPath}';`);
  }

  const isArray = Array.isArray(data);
  if (isArray && typeFormat !== "plain") {
    parts.push(generateArrayContent(data, variableName, typeFormat, type));
  } else {
    parts.push(
      emitTypedConst(variableName, type, JSON.stringify(data, null, 2)),
    );
  }

  return `${parts.join("\n")}\n`;
}

/**
 * Generate content for array data based on the specified format.
 *
 * @param data - Array data
 * @param variableName - Name for the export
 * @param typeFormat - Format to use for the array
 * @param type - Fallback type for plain format
 * @returns TypeScript code string for the array in the specified format
 */
function generateArrayContent(
  data: unknown[],
  variableName: string,
  typeFormat: TypeFormat,
  type: string,
): string {
  switch (typeFormat) {
    case "enum":
      return generateEnumFromArray(data, variableName);
    case "type":
      return generateTypeFromArray(data, variableName);
    case "asconst":
      return generateAsConstFromArray(data, variableName);
    case "interface":
      return generateInterfaceFromArray(data, variableName);
    default:
      return emitTypedConst(variableName, type, JSON.stringify(data, null, 2));
  }
}

export function writeTypedVariableToFile(
  options: WriteTypedVariableOptions,
): Promise<void> {
  const {
    type,
    data,
    variableName,
    outputPath,
    importPath,
    importTypeName,
    includeTimestamp = true,
    typeFormat = "plain",
  } = options;

  if (!variableName || /\s/.test(variableName)) {
    throw new Error("variableName must be a valid identifier (no spaces)");
  }
  if (!outputPath) {
    throw new Error("outputPath is required");
  }

  // Ensure destination dir exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const content = generateContent(
    type,
    data,
    variableName,
    importPath,
    importTypeName,
    includeTimestamp,
    typeFormat,
  );

  return writeFile(outputPath, content);
}

/**
 * Generate a typed constant export statement.
 *
 * @param name - Constant name
 * @param type - TypeScript type annotation
 * @param value - Stringified value
 * @returns TypeScript code string for a typed constant export
 */
function emitTypedConst(name: string, type: string, value: string): string {
  return `export const ${name}: ${type} = ${value};`;
}

/**
 * Convert an array of primitive values to a TypeScript enum.
 *
 * String values must be valid TypeScript identifiers to become enum keys.
 * Invalid identifiers cause the function to fall back to exporting a const array.
 *
 * @param data - Array of primitive values (strings or numbers)
 * @param enumName - Name for the generated enum
 * @returns TypeScript code string containing the enum definition
 *
 * @example
 * ```typescript
 * const code = generateEnumFromArray(['BTC', 'ETH', 'USDT'], 'Token');
 * // Returns: export enum Token { BTC = 'BTC', ETH = 'ETH', USDT = 'USDT' }
 * ```
 */
export function generateEnumFromArray(
  data: unknown[],
  enumName: string,
): string {
  const valid = (v: unknown) =>
    (typeof v === "string" && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(v)) ||
    typeof v === "number";
  const filtered = data.filter(valid);

  if (filtered.length === 0) {
    // Fallback: still export the raw array if we cannot form an enum
    return `export const ${enumName} = ${JSON.stringify(data, null, 2)};`;
  }

  const entries = filtered.map((v) => {
    const key = typeof v === "string" ? v : `VALUE_${v}`;
    const value = typeof v === "string" ? `'${v.replace(/'/g, "\\'")}'` : v;
    return `  ${key} = ${value}`;
  });

  return `export enum ${enumName} {\n${entries.join(",\n")}\n}`;
}

/**
 * Convert an array of primitive values to a TypeScript union type.
 *
 * Creates a union type of literal string/number types from array elements.
 * Non-string/number values are filtered out.
 *
 * @param data - Array of primitive values (strings or numbers)
 * @param typeName - Name for the generated type
 * @returns TypeScript code string containing the type definition
 *
 * @example
 * ```typescript
 * const code = generateTypeFromArray(['BTCUSDT', 'ETHUSDT'], 'Symbol');
 * // Returns: export type Symbol = 'BTCUSDT' | 'ETHUSDT';
 * ```
 */
export function generateTypeFromArray(
  data: unknown[],
  typeName: string,
): string {
  const valid = (v: unknown) => typeof v === "string" || typeof v === "number";
  const filtered = data.filter(valid);

  if (filtered.length === 0) {
    // Fallback: export raw array
    return `export const ${typeName} = ${JSON.stringify(data, null, 2)};`;
  }

  const union = filtered
    .map((v) => (typeof v === "string" ? `'${v.replace(/'/g, "\\'")}'` : v))
    .join(" | ");
  return `export type ${typeName} = ${union};`;
}

/**
 * Convert an array to a TypeScript object with `as const` assertion.
 *
 * Creates a readonly object where array values become object properties.
 * String values that are valid identifiers become property keys with the same name.
 * Invalid identifiers use `ITEM_${index}` as keys.
 * Number values use `VALUE_${number}` as keys.
 *
 * @param data - Array of values to convert to object properties
 * @param variableName - Name for the generated constant
 * @returns TypeScript code string containing the const assertion
 *
 * @example
 * ```typescript
 * const code = generateAsConstFromArray(['BNB', 'BTC', 'USDT'], 'Token');
 * // Returns: export const Token = { BNB: 'BNB', BTC: 'BTC', USDT: 'USDT' } as const;
 * ```
 */
export function generateAsConstFromArray(
  data: unknown[],
  variableName: string,
): string {
  const entries: string[] = [];

  data.forEach((item, index) => {
    let key: string;
    let value: string;

    if (typeof item === "string" && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(item)) {
      key = item;
      value = `'${item.replace(/'/g, "\\'")}'`;
    } else if (typeof item === "string") {
      key = `ITEM_${index}`;
      value = `'${item.replace(/'/g, "\\'")}'`;
    } else if (typeof item === "number") {
      key = `VALUE_${item}`;
      value = String(item);
    } else {
      key = `ITEM_${index}`;
      value = JSON.stringify(item);
    }

    entries.push(`  ${key}: ${value}`);
  });

  return `export const ${variableName} = {\n${entries.join(",\n")}\n} as const;`;
}

/**
 * Convert an array to a TypeScript interface.
 *
 * Creates an interface where array values become interface properties.
 * String values that are valid identifiers become property keys with the same name.
 * Invalid identifiers use `ITEM_${index}` as keys.
 * Number values use `VALUE_${number}` as keys.
 *
 * @param data - Array of values to convert to interface properties
 * @param interfaceName - Name for the generated interface
 * @returns TypeScript code string containing the interface definition
 *
 * @example
 * ```typescript
 * const code = generateInterfaceFromArray(['BNB', 'BTC', 'USDT'], 'TokenData');
 * // Returns: export interface TokenData { BNB: 'BNB'; BTC: 'BTC'; USDT: 'USDT'; }
 * ```
 */
export function generateInterfaceFromArray(
  data: unknown[],
  interfaceName: string,
): string {
  const entries: string[] = [];

  data.forEach((item, index) => {
    let key: string;
    let value: string;

    if (typeof item === "string" && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(item)) {
      key = item;
      value = `'${item.replace(/'/g, "\\'")}'`;
    } else if (typeof item === "string") {
      key = `ITEM_${index}`;
      value = `'${item.replace(/'/g, "\\'")}'`;
    } else if (typeof item === "number") {
      key = `VALUE_${item}`;
      value = String(item);
    } else {
      key = `ITEM_${index}`;
      value = JSON.stringify(item);
    }

    entries.push(`  ${key}: ${value};`);
  });

  return `export interface ${interfaceName} {\n${entries.join("\n")}\n}`;
}

export type { TypeFormat, WriteTypedVariableOptions } from "./types";
