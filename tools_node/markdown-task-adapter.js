#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const FRONTMATTER_MAPPING = {
  'id': { json_field: 'id', type: 'string', required: true },
  'title': { json_field: 'title', type: 'string', required: true },
  'owner': { json_field: 'owner', type: 'string', required: true },
  'priority': { json_field: 'priority', type: 'string', required: true },
  'status': { json_field: 'status', type: 'string', required: true },
  'type': { json_field: 'type', type: 'string', required: true },
  'phase': { json_field: 'phase', type: 'string', required: true },
  'created': { json_field: 'created', type: 'string', required: true },
  'created_by_agent': { json_field: 'created_by_agent', type: 'string', required: true },
  'started_at': { json_field: 'started_at', type: 'string', required: false },
  'started_by_agent': { json_field: 'started_by_agent', type: 'string', required: false },
  'completed_at': { json_field: 'completed_at', type: 'string', required: false },
  'completed_by_agent': { json_field: 'completed_by_agent', type: 'string', required: false },
  'related_cards': { json_field: 'related', type: 'array', required: false },
  'depends': { json_field: 'depends', type: 'array', required: false },
};

function readMarkdownTaskCard(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Invalid markdown task card format: ${filePath}`);
  }

  const frontmatter = yaml.load(match[1]);
  const body = match[2];

  return { frontmatter, body };
}

function extractBodySections(body) {
  const sections = {};
  let currentSection = null;
  let currentContent = [];

  const lines = body.split('\n');
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = heading[1].trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

function fronmatterToWorkItem(frontmatter) {
  const workItem = {};

  for (const [mdKey, mdValue] of Object.entries(frontmatter || {})) {
    const mapping = FRONTMATTER_MAPPING[mdKey];
    if (!mapping) {
      continue;
    }

    const { json_field, type } = mapping;
    let jsonValue = mdValue;

    if (type === 'array' && mdValue && !Array.isArray(mdValue)) {
      if (typeof mdValue === 'string') {
        jsonValue = mdValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else if (Array.isArray(mdValue)) {
        jsonValue = mdValue;
      }
    }

    workItem[json_field] = jsonValue;
  }

  return workItem;
}

function workItemToFrontmatter(workItem) {
  const frontmatter = {};

  for (const [mdKey, mapping] of Object.entries(FRONTMATTER_MAPPING)) {
    const jsonField = mapping.json_field;
    if (jsonField in workItem) {
      let value = workItem[jsonField];
      if (mapping.type === 'array' && Array.isArray(value)) {
        value = value;
      }
      frontmatter[mdKey] = value;
    }
  }

  return frontmatter;
}

function buildMarkdownFromWorkItem(workItem, bodySections = {}) {
  const frontmatter = workItemToFrontmatter(workItem);
  const yamlStr = yaml.dump(frontmatter, { lineWidth: -1 });

  let body = '';
  if (bodySections['摘要']) {
    body += '## 摘要\n' + bodySections['摘要'].trim() + '\n\n';
  }
  if (bodySections['驗證條件']) {
    body += '## 驗證條件\n' + bodySections['驗證條件'].trim() + '\n\n';
  }
  if (bodySections['交付物']) {
    body += '## 交付物\n' + bodySections['交付物'].trim() + '\n\n';
  }
  if (bodySections['相關聯任務卡']) {
    body += '## 相關聯任務卡\n' + bodySections['相關聯任務卡'].trim() + '\n\n';
  }
  if (bodySections['備註']) {
    body += '## 備註\n' + bodySections['備註'].trim();
  }

  return `---\n${yamlStr}---\n\n${body}`;
}

function main() {
  const cmd = process.argv[2];
  const arg = process.argv[3];

  if (cmd === 'read') {
    if (!arg) {
      console.error('read requires a file path');
      process.exit(1);
    }
    try {
      const { frontmatter, body } = readMarkdownTaskCard(arg);
      const workItem = fronmatterToWorkItem(frontmatter);
      const sections = extractBodySections(body);
      const result = { workItem, body_sections: sections };
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('[markdown-task-adapter] Error reading task card:', error.message);
      process.exit(1);
    }
  } else if (cmd === 'write') {
    if (!arg) {
      console.error('write requires a file path');
      process.exit(1);
    }
    try {
      const stdinData = fs.readFileSync(0, 'utf8');
      const { workItem, body_sections } = JSON.parse(stdinData);
      const markdown = buildMarkdownFromWorkItem(workItem, body_sections);
      fs.writeFileSync(arg, markdown, 'utf8');
      console.log(`[markdown-task-adapter] Wrote task card: ${arg}`);
    } catch (error) {
      console.error('[markdown-task-adapter] Error writing task card:', error.message);
      process.exit(1);
    }
  } else if (cmd === 'validate-mapping') {
    const schema = require('./.atm/schema/frontmatter-mapping.json');
    const mappingObj = {
      version: 1,
      mappings: Object.entries(FRONTMATTER_MAPPING).map(([mdKey, config]) => ({
        markdown_field: mdKey,
        json_field: config.json_field,
        type: config.type,
        required: config.required,
      })),
    };
    console.log(JSON.stringify(mappingObj, null, 2));
  } else {
    console.error('Usage: markdown-task-adapter <read|write|validate-mapping> [file-path]');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  readMarkdownTaskCard,
  extractBodySections,
  fronmatterToWorkItem,
  workItemToFrontmatter,
  buildMarkdownFromWorkItem,
};
