import path from 'node:path';
import { slugify } from './text.mjs';

const knownLayouts = new Set(['flow', 'compare-bands', 'hub-cluster', 'artifact-loop']);

export function buildDiagramSpecs(config, docs) {
  const explicit = config.diagrams.map((diagram, index) => normalizeSpec(diagram, index, docs));
  if (explicit.length >= config.diagramCount) return explicit.slice(0, config.diagramCount);

  const auto = autoPlan(config, docs, config.diagramCount - explicit.length, explicit.length);
  return [...explicit, ...auto].slice(0, config.diagramCount);
}

function normalizeSpec(diagram, index, docs) {
  const title = diagram.title ?? `图 ${index + 1}`;
  return {
    id: diagram.id ?? `diagram-${index + 1}`,
    slug: diagram.slug ?? `${String(index + 1).padStart(2, '0')}-${slugify(title)}`,
    layout: knownLayouts.has(diagram.layout) ? diagram.layout : 'flow',
    title,
    subtitle: diagram.subtitle ?? '',
    sourceFiles: diagram.sourceFiles ?? docs.map((doc) => doc.path),
    nodes: diagram.nodes ?? [],
    groups: diagram.groups ?? [],
    bands: diagram.bands ?? [],
    note: diagram.note ?? '',
    metadata: diagram.metadata ?? {},
  };
}

function autoPlan(config, docs, count, offset) {
  const title = inferProjectTitle(config, docs);
  const allText = docs.map((doc) => doc.content).join('\n');
  const specs = [
    buildArchitectureSpec(title, docs, allText),
    buildWorkflowSpec(title, docs, allText),
    buildInputSpec(title, docs),
    buildArtifactSpec(title, docs, allText),
  ];

  return specs.slice(0, count).map((spec, index) => ({
    ...spec,
    id: `diagram-${offset + index + 1}`,
    slug: `${String(offset + index + 1).padStart(2, '0')}-${spec.slug}`,
  }));
}

function buildArchitectureSpec(projectTitle, docs, allText) {
  const capabilities = pickTerms(allText, [
    ['source.analyze', '读取原型源码', '提取结构、状态和交互意图'],
    ['runtime.capture', '抓取运行画面', '记录当前可见内容和截图'],
    ['screenshot.attach', '补充截图文字', '接入截图与 OCR 证据'],
    ['target.inspect', '读取客户端规范', '找到模块、组件和主题规则'],
    ['page.merge', '合并页面证据', '保留来源、冲突和确认项'],
    ['ui.plan', '生成实现计划', '给出文件、组件和复用建议'],
    ['ui.review', '生成交接说明', '输出人类可读任务书'],
    ['ui.validate', '实现后检查', '检查改动范围和风险'],
  ]);

  return {
    slug: 'capability-architecture',
    layout: 'hub-cluster',
    title: '同一套能力，服务不同入口',
    subtitle: '入口可以不同，真正可复用的是中间的证据处理能力',
    groups: [
      {
        title: '使用入口',
        nodes: [
          { title: '命令行', subtitle: '本地生成和批量处理' },
          { title: 'AI 工具', subtitle: '让编码助手直接调用' },
          { title: '代码接入', subtitle: '嵌入其它自动化工具' },
        ],
      },
      {
        title: '共享处理',
        nodes: capabilities.slice(0, 6),
      },
      {
        title: '输出结果',
        nodes: [
          { title: '页面事实', subtitle: '统一上下文和证据来源' },
          { title: '实现计划', subtitle: '目标文件、组件和复用建议' },
          { title: '交接说明', subtitle: '人和 AI 都能继续执行' },
        ],
      },
    ],
    sourceFiles: docs.map((doc) => doc.path),
  };
}

function buildWorkflowSpec(projectTitle, docs) {
  const workflowDoc = docs.find((doc) => /workflows?\.md$/i.test(doc.path) || doc.headings.some((heading) => /工作流|workflow/i.test(heading.text)))
    ?? docs.find((doc) => /工作流|workflow/i.test(doc.content))
    ?? docs[0];
  const codeFlow = findCodeFlow(workflowDoc) ?? findCodeFlow(docs.find((doc) => doc.codeBlocks.length));
  const nodes = codeFlow?.length >= 4
    ? codeFlow.slice(0, 6).map((item) => workflowNodeFromTerm(item))
    : [];

  const fallback = [
    { title: '准备材料', subtitle: '源码、网页、截图或目标工程' },
    { title: '采集证据', subtitle: '读取结构、运行画面和规范' },
    { title: '合并上下文', subtitle: '保留来源、冲突和确认项' },
    { title: '生成交接', subtitle: '实现计划和 review 文档' },
    { title: '落地实现', subtitle: '按目标工程规范修改' },
    { title: '实现后检查', subtitle: '检查范围和常见风险' },
  ];

  return {
    slug: 'workflow',
    layout: 'flow',
    title: `${projectTitle} 工作流`,
    subtitle: '手上有什么证据，就组合什么能力',
    nodes: nodes.length >= 4 ? nodes : fallback,
    note: '证据越多，交接越完整；但不强制所有输入同时存在',
    sourceFiles: docs.map((doc) => doc.path),
  };
}

function buildInputSpec(projectTitle, docs) {
  return {
    slug: 'input-selection',
    layout: 'compare-bands',
    title: '手上有什么材料，就走哪条路',
    subtitle: '把不同输入组合映射到不同证据能力，而不是强行补齐所有材料',
    bands: [
      {
        title: '输入材料',
        note: '源码、URL、截图、OCR、目标工程或已实现 diff',
        accent: 'blue',
        items: [
          { title: '有原型源码', subtitle: '读取结构和交互意图' },
          { title: '有运行页面', subtitle: '抓取真实渲染结果' },
          { title: '只有截图', subtitle: '作为视觉和文字补证' },
        ],
      },
      {
        title: '处理方式',
        note: '根据证据类型组合 source、runtime、screenshot、target 和 validation',
        accent: 'teal',
        items: [
          { title: '按字段合并', subtitle: '不同证据负责不同事实' },
          { title: '保留冲突', subtitle: '暴露需要人工确认的问题' },
          { title: '输出交接', subtitle: '形成计划、说明和检查线索' },
        ],
      },
    ],
    note: '选择原则：能提供多少证据就用多少证据',
    sourceFiles: docs.map((doc) => doc.path),
  };
}

function buildArtifactSpec(projectTitle, docs, allText) {
  const artifacts = pickTerms(allText, [
    ['page-canonical.json', '页面证据', '记录事实、来源和冲突', 'page-canonical.json'],
    ['page-debug-index.json', '快速定位', '按区块和文字查找', 'page-debug-index.json'],
    ['ui-build-plan.json', '实现计划', '拆文件、组件和复用', 'ui-build-plan.json'],
    ['ui-build-review.md', '交接说明', '形成自然语言任务', 'ui-build-review.md'],
    ['screenshots', '截图证据', '用于视觉核对和 OCR', 'screenshots/full-page.png'],
    ['validation', '实现后检查', '检查改动范围和风险', 'validation result'],
  ]).map((item) => ({
    title: item.title,
    subtitle: item.subtitle,
    tag: item.tag,
  }));

  return {
    slug: 'artifact-loop',
    layout: 'artifact-loop',
    title: '从证据到实现，再回到检查',
    subtitle: '产物不是为了堆文件，而是让实现前、实现中、实现后都有依据',
    nodes: artifacts.length >= 4 ? artifacts : [
      { title: '页面证据', subtitle: '记录事实、来源和冲突', tag: 'page-canonical.json' },
      { title: '快速定位', subtitle: '按区块和文字查找', tag: 'page-debug-index.json' },
      { title: '实现计划', subtitle: '拆文件、组件和复用', tag: 'ui-build-plan.json' },
      { title: '交接说明', subtitle: '形成自然语言任务', tag: 'ui-build-review.md' },
      { title: '客户端实现', subtitle: '按计划落到目标工程' },
      { title: '实现后检查', subtitle: '检查改动范围和风险' },
    ],
    note: '检查结果回到计划和交接说明，修正后再次验证',
    sourceFiles: docs.map((doc) => doc.path),
  };
}

function findCodeFlow(doc) {
  if (!doc) return null;
  for (const block of doc.codeBlocks) {
    const text = block.lines.join('\n');
    if (!text.includes('->')) continue;
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*->\s*/, '').trim())
      .filter(Boolean)
      .flatMap((line) => line.split(/\s*\/\s*/).map((item) => item.trim()).filter(Boolean));
  }
  return null;
}

function workflowNodeFromTerm(term) {
  const value = term.toLowerCase();
  if (value.includes('source.analyze')) return { title: '分析源码', subtitle: '读取结构、状态和交互意图' };
  if (value.includes('runtime.capture')) return { title: '采集运行态', subtitle: '抓取可见内容、样式和截图' };
  if (value.includes('screenshot.attach')) return { title: '附加截图', subtitle: '补充 OCR 和视觉证据' };
  if (value.includes('target.inspect')) return { title: '读取目标工程', subtitle: '获得组件、主题和路由规范' };
  if (value.includes('page.merge')) return { title: '合并证据', subtitle: '保留来源、冲突和确认项' };
  if (value.includes('ui.plan')) return { title: '生成计划', subtitle: '拆目标文件、组件和复用建议' };
  if (value.includes('ui.review')) return { title: '生成交接', subtitle: '形成可执行说明文档' };
  if (value.includes('implementation')) return { title: '落地实现', subtitle: '按目标工程规范修改代码' };
  if (value.includes('ui.validate') || value.includes('validation')) return { title: '实现后检查', subtitle: '检查改动范围和常见风险' };
  if (value.includes('input')) return { title: '准备材料', subtitle: '源码、网页、截图或目标工程' };
  if (value.includes('capability')) return { title: '编排能力', subtitle: '根据输入组合共享能力' };
  if (value.includes('context')) return { title: '统一上下文', subtitle: '形成页面事实和证据底稿' };
  if (value.includes('artifact')) return { title: '输出产物', subtitle: '写出计划、说明和证据文件' };
  if (value.includes('target')) return { title: '客户端实现', subtitle: '落到目标工程并验证' };
  return { title: shorten(term, 12), subtitle: '来自文档流程' };
}

function pickTerms(text, definitions) {
  const lower = text.toLowerCase();
  const found = definitions
    .filter(([needle]) => lower.includes(String(needle).toLowerCase()))
    .map(([, title, subtitle, tag]) => ({ title, subtitle, tag }));
  return found.length ? found : definitions.map(([, title, subtitle, tag]) => ({ title, subtitle, tag }));
}

function inferProjectTitle(config, docs) {
  if (config.projectName) return config.projectName;
  const h1 = docs.flatMap((doc) => doc.headings.map((heading) => ({ ...heading, doc }))).find((heading) => heading.level === 1);
  if (h1) return h1.text.replace(/^@/, '');
  return '文档';
}

function shorten(text, maxChars) {
  const chars = Array.from(String(text ?? ''));
  return chars.length > maxChars ? `${chars.slice(0, maxChars).join('')}…` : chars.join('');
}
