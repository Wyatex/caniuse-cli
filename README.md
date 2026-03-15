# @wyatex/caniuse-cli

<div align="center">

**A powerful CLI tool for analyzing browser compatibility of your JavaScript/TypeScript projects**

[![npm version](https://img.shields.io/npm/v/@wyatex/caniuse-cli.svg)](https://www.npmjs.com/package/@wyatex/caniuse-cli)
[![Bun](https://img.shields.io/badge/runtime-bun-black)](https://bun.sh)
[![License](https://img.shields.io/npm/l/@wyatex/caniuse-cli.svg)](./LICENSE)

</div>

---

## Features

- **Real-time Analysis** - Live scanning progress with WebSocket updates
- **File Tree Navigation** - Interactive directory tree with file selection
- **Browser Compatibility Matrix** - Minimum required versions for Chrome, Firefox, Safari, Edge
- **Feature Detection** - Comprehensive ES6+ syntax and API detection
- **Source Code Links** - Click to open files in your IDE at the exact line
- **Vue SFC Support** - Analyze Vue single-file components out of the box

## Supported File Types

| Type       | Extensions    |
| ---------- | ------------- |
| JavaScript | `.js`, `.jsx` |
| TypeScript | `.ts`, `.tsx` |
| Vue        | `.vue`        |

## Installation

```bash
# Using bun
bun add -g @wyatex/caniuse-cli

# Using npm
npm install -g @wyatex/caniuse-cli

# Using pnpm
pnpm add -g @wyatex/caniuse-cli
```

## Usage

```bash
# Analyze current directory
caniuse-cli

# Analyze specific directory
caniuse-cli ./src

# Specify port
caniuse-cli --port 8080

# Don't open browser automatically
caniuse-cli --no-open

# Short flags
caniuse-cli -p 8080 -o
```

### Command Line Options

| Option            | Alias | Description                                       |
| ----------------- | ----- | ------------------------------------------------- |
| `[directory]`     | -     | Directory to analyze (default: current directory) |
| `--port <number>` | `-p`  | Server port (default: 3000)                       |
| `--open`          | `-o`  | Open browser automatically                        |
| `--no-open`       | -     | Don't open browser automatically                  |

## Screenshot

```
┌─────────────────────────────────────────────────────────────────────┐
│  caniuse-cli - Browser Compatibility Analyzer                       │
├────────────────────────────┬────────────────────────────────────────┤
│  FILE TREE                 │  BROWSER REQUIREMENTS                  │
│  ├─ src                    │                                        │
│  │  ├─ components          │  ┌──────────┐ ┌──────────┐            │
│  │  │  └─ App.tsx    ◀────│  │ Chrome   │ │ Firefox  │            │
│  │  ├─ utils               │  │   80+    │ │   72+    │            │
│  │  │  └─ helper.ts        │  └──────────┘ └──────────┘            │
│  │  └─ index.ts            │                                        │
│  └─ package.json           │  DETECTED FEATURES                     │
│                            │  ─────────────────────                 │
│                            │  Optional Chaining    (v80+ / v74+)   │
│                            │  Nullish Coalescing   (v80+ / v72+)   │
│                            │  Async/Await          (v55+ / v52+)   │
│                            │  Arrow Functions      (v45+ / v22+)   │
│                            │                                        │
│                            │  [src/components/App.tsx:42]           │
│                            │  [src/utils/helper.ts:15]             │
└────────────────────────────┴────────────────────────────────────────┘
```

## Detected Features

### ES6+ (2015)

- Arrow Functions
- Classes
- Template Literals
- Destructuring
- Spread Operator
- Object.values() / Object.entries()

### ES2016+

- Exponentiation Operator
- Array.prototype.includes

### ES2017+

- Async/Await
- Object.entries / Object.values

### ES2019+

- Optional Chaining (`?.`)
- Nullish Coalescing (`??`)

### ES2020+

- BigInt
- Dynamic Import

### ES2021+

- Logical Assignment (`??=`, `||=`, `&&=`)

### ES2022+

- Top-level Await
- Class Fields

### ES2023+

- Array Methods (`toSorted`, `toReversed`, `with`, etc.)

## Data Sources

This tool combines multiple data sources for accurate compatibility information:

| Source                                                       | Purpose                  |
| ------------------------------------------------------------ | ------------------------ |
| [caniuse-lite](https://github.com/browserslist/caniuse-lite) | Native API support       |
| [@babel/compat-data](https://babeljs.io/)                    | Syntax transform plugins |
| [core-js-compat](https://github.com/zloirock/core-js)        | Polyfill requirements    |

## Tech Stack

| Layer    | Technology                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| Runtime  | [Bun](https://bun.sh)                                                                                           |
| Backend  | [ElysiaJS](https://elysiajs.com)                                                                                |
| Frontend | [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)                                       |
| Build    | [Vite](https://vitejs.dev) + [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) |
| Parser   | [@babel/parser](https://babeljs.io/docs/babel-parser) + [@vue/compiler-sfc](https://vuejs.org)                  |

## Development

```bash
# Clone the repository
git clone https://github.com/wyatex/caniuse-cli.git
cd caniuse-cli

# Install dependencies
bun install

# Build frontend
bun run build

# Run in development mode
bun run dev

# Run frontend dev server (separate terminal)
bun run web:dev
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with by [wyatex](https://github.com/wyatex)

</div>
