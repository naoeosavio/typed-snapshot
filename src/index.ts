import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { dirname } from "path";
import type { WriteTypedVariableOptions } from "./types";

/**
 * Generate a TypeScript file exporting a typed constant, enum, or union type.
 * - Adds a header and optional timestamp
 * - Optionally imports a type via `import type { T } from '...'`
 * - For arrays, supports emitting `enum` or `type` unions
 */
export async function writeTypedVariableToFile(
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

  const parts: string[] = ["// Auto-generated file – DO NOT EDIT"]; 
  if (includeTimestamp) {
    parts.push(`// Last updated: ${new Date().toISOString()}`);
  }
  if (importPath && importTypeName) {
    parts.push(`import type { ${importTypeName} } from '${importPath}';`);
  }

  const isArray = Array.isArray(data);
  if (isArray && typeFormat !== "plain") {
    if (typeFormat === "enum") {
      parts.push(generateEnumFromArray(data, variableName));
    } else if (typeFormat === "type") {
      parts.push(generateTypeFromArray(data, variableName));
    } else {
      parts.push(
        emitTypedConst(variableName, type, JSON.stringify(data, null, 2)),
      );
    }
  } else {
    parts.push(emitTypedConst(variableName, type, JSON.stringify(data, null, 2)));
  }

  // Always end with trailing newline for POSIX friendliness
  const content = parts.join("\n") + "\n";
  await writeFile(outputPath, content);
}

function emitTypedConst(name: string, type: string, value: string): string {
  return `export const ${name}: ${type} = ${value};`;
}

/** Convert an array of primitives to a TypeScript enum. */
export function generateEnumFromArray(data: any[], enumName: string): string {
  const valid = (v: unknown) =>
    (typeof v === "string" && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(v)) ||
    typeof v === "number";
  const filtered = data.filter(valid);

  if (filtered.length === 0) {
    // Fallback: still export the raw array if we cannot form an enum
    return `export const ${enumName} = ${JSON.stringify(data, null, 2)};`;
  }

  const entries = filtered.map(v => {
    const key = typeof v === "string" ? v : `VALUE_${v}`;
    const value = typeof v === "string" ? `'${v.replace(/'/g, "\\'")}'` : v;
    return `  ${key} = ${value}`;
  });

  return `export enum ${enumName} {\n${entries.join(",\n")}\n}`;
}

/** Convert an array of primitives to a union of literal types. */
export function generateTypeFromArray(data: any[], typeName: string): string {
  const valid = (v: unknown) => typeof v === "string" || typeof v === "number";
  const filtered = data.filter(valid);

  if (filtered.length === 0) {
    // Fallback: export raw array
    return `export const ${typeName} = ${JSON.stringify(data, null, 2)};`;
  }

  const union = filtered
    .map(v => (typeof v === "string" ? `'${v.replace(/'/g, "\\'")}'` : v))
    .join(" | ");
  return `export type ${typeName} = ${union};`;
}

export type { WriteTypedVariableOptions, TypeFormat } from "./types";

