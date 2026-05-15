# AI Diagram Generator

Config-driven Markdown diagram generator for documentation projects.

The tool reads selected Markdown files, plans a fixed number of diagrams, renders editorial SVG/PNG output, and fails checks when obvious layout problems are detected.

## Usage

```bash
pnpm install
pnpm run install:browsers
node bin/ai-diagram.mjs generate --config examples/proto-bridge.diagram.config.json
```

Fast iteration:

```bash
node bin/ai-diagram.mjs plan --config examples/proto-bridge.diagram.config.json
node bin/ai-diagram.mjs check --config examples/proto-bridge.diagram.config.json
node bin/ai-diagram.mjs generate --config examples/proto-bridge.diagram.config.json --svg-only
node bin/ai-diagram.mjs generate --config examples/proto-bridge.diagram.config.json --only 2
node bin/ai-diagram.mjs generate --config examples/proto-bridge.diagram.config.json --png
```

## Config

```json
{
  "projectName": "ProtoBridge",
  "sources": [
    "../../../proto-bridge/docs/architecture.md",
    "../../../proto-bridge/docs/workflows.md"
  ],
  "diagramCount": 4,
  "outDir": "../../../proto-bridge/docs/assets/ai-tools-diagrams",
  "strict": true
}
```

With no explicit `diagrams`, the planner creates up to four diagrams:

- `hub-cluster`
- `flow`
- `compare-bands`
- `artifact-loop`

You can override any diagram by adding `diagrams`:

```json
{
  "diagrams": [
    {
      "slug": "01-custom-flow",
      "layout": "flow",
      "title": "自定义流程",
      "subtitle": "人工指定内容，渲染器负责布局和质量检查",
      "nodes": [
        { "title": "准备材料", "subtitle": "读取 Markdown" },
        { "title": "规划图稿", "subtitle": "生成结构化 spec" },
        { "title": "渲染检查", "subtitle": "输出 SVG/PNG" }
      ]
    }
  ]
}
```

## Quality Gates

`strict: true` makes generation fail before writing broken output when checks detect:

- node or note boxes outside the frame
- title or subtitle overflow risk
- overlapping boxes
- unsupported layouts

PNG export is cached by source content and diagram spec. Re-running `generate` skips PNG work unless content changes, SVG changes, `--png`, or `--force` is used.
