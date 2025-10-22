# typed-snapshot

Generate typed TypeScript snapshots to disk — as a constant, an enum, or a union type — with optional `import type` headers and timestamps.

## Install

```bash
npm i typed-snapshot
```

or in a monorepo, add as a local workspace and `npm run build` inside the package.

## Usage

```ts
import { writeTypedVariableToFile } from 'typed-snapshot';

await writeTypedVariableToFile({
  type: '{ base: Tokens; total: number }',
  data: { base: 'USDT', total: 123.4567 },
  variableName: 'PORTFOLIO_SALDO',
  outputPath: './data/portfolio_saldo.ts',
  importPath: '../src/enums/Tokens',
  importTypeName: 'Tokens',
  includeTimestamp: true,
});
```

### Arrays → enum

```ts
await writeTypedVariableToFile({
  type: 'never', // ignored for enum emission
  data: ['BTC', 'ETH', 'USDT'],
  variableName: 'Token',
  outputPath: './data/Token.ts',
  typeFormat: 'enum',
});
```

### Arrays → union type

```ts
await writeTypedVariableToFile({
  type: 'never', // ignored for type emission
  data: ['BTCUSDT', 'ETHUSDT'],
  variableName: 'Symbol',
  outputPath: './data/Symbol.ts',
  typeFormat: 'type',
});
```

## API

- `writeTypedVariableToFile(options): Promise<void>`
  - `type`: string — type annotation for the exported const (plain mode)
  - `data`: any — data to serialize
  - `variableName`: string — export name (also used as enum/type name)
  - `outputPath`: string — file path to write
  - `importPath?`, `importTypeName?` — optional `import type` header
  - `includeTimestamp?` (default true)
  - `typeFormat?`: `'plain' | 'enum' | 'type'`

Helpers are also exported: `generateEnumFromArray`, `generateTypeFromArray`.

## Notes

- The library has zero runtime dependencies. Build with `tsc`.
- For `enum` mode, string values must be valid TypeScript identifiers to become keys; otherwise the file falls back to exporting a const array.

## Contributing

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-name`.
3. Commit your changes: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature-name`.
5. Open a pull request.

## License

Distributed under the MIT License. See the [LICENSE](LICENSE) file for more details.
