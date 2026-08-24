# typed-snapshot

Generate typed TypeScript snapshots to disk — as a constant, an enum, a union type, an `as const` object, or an interface — with optional `import type` headers and timestamps.

All functions return a [`Result`](https://www.npmjs.com/package/lite-fp) (`Done | Fail`) from [lite-fp](https://github.com/naoeosavio/lite-fp) instead of throwing: failures are values you match on, with typed error kinds.

## Install

```bash
npm i typed-snapshot
```

or in a monorepo, add as a local workspace and `npm run build` inside the package.

## Usage

```ts
import { Result, writeTypedVariableToFile } from 'typed-snapshot';

const result = await writeTypedVariableToFile({
  type: '{ base: Tokens; total: number }',
  data: { base: 'USDT', total: 123.4567 },
  variableName: 'PORTFOLIO_SALDO',
  outputPath: './data/portfolio_saldo.ts',
  importPath: '../src/enums/Tokens',
  importTypeName: 'Tokens',
  includeTimestamp: true,
});

Result.match(result, {
  done: () => console.log('snapshot written'),
  fail: (error) => console.error(error.kind),
});
```

### Arrays → as const object

```ts
import { generateAsConstFromArray } from 'typed-snapshot';

const result = generateAsConstFromArray(['BNB', 'BTC', 'USDT', 'ETH'], 'Token');

Result.match(result, {
  done: (code) => console.log(code),
  fail: (error) => console.error(error.kind),
});
```

Generates:
```typescript
export const Token = {
  BNB: 'BNB',
  BTC: 'BTC',
  USDT: 'USDT',
  ETH: 'ETH',
} as const;
```

### Arrays → enum

```ts
generateEnumFromArray(['BTC', 'ETH', 'USDT'], 'Token');
// Done: export enum Token { BTC = 'BTC', ETH = 'ETH', USDT = 'USDT' }
```

### Arrays → union type

```ts
generateTypeFromArray(['BTCUSDT', 'ETHUSDT'], 'Symbol');
// Done: export type Symbol = 'BTCUSDT' | 'ETHUSDT';
```

### Arrays → interface

```ts
generateInterfaceFromArray(['BNB', 'BTC', 'USDT', 'ETH'], 'TokenData');
// Done: export interface TokenData { BNB: 'BNB'; BTC: 'BTC'; USDT: 'USDT'; ETH: 'ETH'; }
```

### Composing generation with writing

Because generators are pure and return `Result`, you can build a pipeline that
only touches the disk when the content is valid:

```ts
import { Result } from 'lite-fp';
import { generateAsConstFromArray } from 'typed-snapshot';
import { writeTypedVariableToFile } from 'typed-snapshot';

const header = '// tokens snapshot\n';

const file = Result.flatMap(
  generateAsConstFromArray(tokens, 'Token'),
  (code) =>
    writeTypedVariableToFile({
      type: 'never',
      data: [code], // or write `code` yourself
      variableName: 'Token',
      outputPath: './data/Token.ts',
    }),
);
```

## API

- `writeTypedVariableToFile(options): Promise<Result<void, SnapshotError>>`
  - `type`: string — type annotation for the exported const (plain mode)
  - `data`: unknown — data to serialize (must be a non-empty array for non-plain formats)
  - `variableName`: string — export name (also used as enum/type/interface name)
  - `outputPath`: string — file path to write
  - `importPath?`, `importTypeName?` — optional `import type` header (emitted only when both are set)
  - `includeTimestamp?` (default true)
  - `typeFormat?`: `'plain' | 'enum' | 'type' | 'asconst' | 'interface'`
- `generateEnumFromArray(data, enumName): Result<string, GenerationError>`
- `generateTypeFromArray(data, typeName): Result<string, GenerationError>`
- `generateAsConstFromArray(data, variableName): Result<string, GenerationError>`
- `generateInterfaceFromArray(data, interfaceName): Result<string, GenerationError>`
- `generateContent(options): Result<string, GenerationError>` — pure file body builder
- `describeSnapshotError(error): string` — human-readable message for any error
- `isValidIdentifier(value)` / `emitTypedConst(name, type, value)` — low-level helpers

`Result`, `done`, `fail`, `Done` and `Fail` are re-exported from `lite-fp` for convenience.

### Error kinds

| kind                  | meaning                                              |
| --------------------- | ---------------------------------------------------- |
| `not-array`           | data was not an array (extra field: `received`)       |
| `empty-data`          | data array was empty                                  |
| `no-valid-items`      | no valid items remained after filtering (enum/type)   |
| `invalid-name`        | export name is not a TypeScript identifier            |
| `invalid-output-path` | output path missing/blank                             |
| `io`                  | filesystem write failed (original error under `cause`)|

## Notes

- The library has a single runtime dependency: [`lite-fp`](https://www.npmjs.com/package/lite-fp). Build with `tsup`.
- Nothing throws: every failure mode above comes back as `Fail`.
- For `enum` mode, string values must be valid TypeScript identifiers to become keys; numbers become `VALUE_<n>` keys; anything else is filtered out.
- For `asconst` and `interface` modes:
  - String values that are valid TypeScript identifiers use the value as the property key
  - Invalid identifiers use `ITEM_${index}` as the property key
  - Number values use `VALUE_${number}` as the property key

## Migrating from 0.3 to 0.4

Breaking changes:

- All generators now take `data: unknown` and return `Result<string, GenerationError>`. Use `Result.match` / `Result.getOrElse` to extract code.
- `writeTypedVariableToFile` returns `Promise<Result<void, SnapshotError>>` and never throws.
- Empty arrays and "no valid items" are now explicit `Fail`s instead of silently exporting a raw array.
- `variableName` must be a full TypeScript identifier (previously only spaces were rejected).

```diff
- const code = generateAsConstFromArray(tokens, 'Token');
+ const code = Result.getOrElse(generateAsConstFromArray(tokens, 'Token'), '');

- await writeTypedVariableToFile({ ... });
+ const result = await writeTypedVariableToFile({ ... });
+ Result.match(result, { done: () => {}, fail: (e) => console.error(e.kind) });
```

## Contributing

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-name`.
3. Commit your changes: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature-name`.
5. Open a pull request.

## License

Distributed under the MIT License. See the [LICENSE](LICENSE) file for more details.
