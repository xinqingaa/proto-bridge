export type VueSfcSections = {
  template?: string | undefined;
  script?: string | undefined;
  styleBlocks: string[];
};

export function extractVueSfcSections(sourceCode: string | undefined): VueSfcSections {
  if (!sourceCode) return { styleBlocks: [] };

  return {
    template: firstBlock(sourceCode, 'template'),
    script: firstBlock(sourceCode, 'script'),
    styleBlocks: allBlocks(sourceCode, 'style'),
  };
}

function firstBlock(sourceCode: string, tag: string): string | undefined {
  return allBlocks(sourceCode, tag)[0];
}

function allBlocks(sourceCode: string, tag: string): string[] {
  const blocks: string[] = [];
  const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sourceCode))) {
    blocks.push(match[1]?.trim() ?? '');
  }
  return blocks;
}
