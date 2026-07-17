import ts from 'typescript';

export type StaticExportedArray = {
  name: string;
  value: unknown[];
};

export type StaticExportParseIssue = {
  name: string;
  message: string;
};

export type StaticExportParseResult = {
  arrays: StaticExportedArray[];
  arrayNames: string[];
  issues: StaticExportParseIssue[];
  warnings: string[];
};

/**
 * Reads exported const arrays without executing source code.
 *
 * Supported values intentionally match JSON-like registry data. TypeScript
 * annotations, `as const`, `satisfies`, and parenthesized expressions are
 * unwrapped before evaluation. Dynamic expressions are rejected.
 */
export function parseStaticExportedArrays(
  source: string,
  fileName = 'registry.ts',
): StaticExportParseResult {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(fileName),
  );
  const arrays: StaticExportedArray[] = [];
  const arrayNames: string[] = [];
  const issues: StaticExportParseIssue[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) continue;
    if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const initializer = unwrapExpression(declaration.initializer);
      if (!ts.isArrayLiteralExpression(initializer)) continue;
      arrayNames.push(declaration.name.text);

      try {
        const value = evaluateStaticExpression(initializer, sourceFile, 0);
        if (Array.isArray(value)) arrays.push({ name: declaration.name.text, value });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push({
          name: declaration.name.text,
          message: `Unable to statically parse ${fileName}#${declaration.name.text}: ${message}`,
        });
      }
    }
  }

  return { arrays, arrayNames, issues, warnings: issues.map((issue) => issue.message) };
}

function evaluateStaticExpression(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  depth: number,
): unknown {
  if (depth > 64) throw expressionError(expression, sourceFile, 'static value nesting exceeds 64 levels');
  const node = unwrapExpression(expression);

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;

  if (ts.isPrefixUnaryExpression(node)) {
    const value = evaluateStaticExpression(node.operand, sourceFile, depth + 1);
    if (typeof value !== 'number' || (node.operator !== ts.SyntaxKind.PlusToken && node.operator !== ts.SyntaxKind.MinusToken)) {
      throw expressionError(node, sourceFile, 'only unary + or - on numeric literals is supported');
    }
    return node.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => {
      if (ts.isSpreadElement(element)) {
        throw expressionError(element, sourceFile, 'spread elements are not statically supported');
      }
      if (ts.isOmittedExpression(element)) {
        throw expressionError(element, sourceFile, 'array holes are not statically supported');
      }
      return evaluateStaticExpression(element, sourceFile, depth + 1);
    });
  }

  if (ts.isObjectLiteralExpression(node)) {
    const result: Record<string, unknown> = {};
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        throw expressionError(property, sourceFile, 'spread properties are not statically supported');
      }
      if (!ts.isPropertyAssignment(property)) {
        throw expressionError(property, sourceFile, 'only explicit property assignments are statically supported');
      }
      const name = staticPropertyName(property.name, sourceFile);
      result[name] = evaluateStaticExpression(property.initializer, sourceFile, depth + 1);
    }
    return result;
  }

  throw expressionError(node, sourceFile, `dynamic ${ts.SyntaxKind[node.kind]} expression is not supported`);
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function staticPropertyName(name: ts.PropertyName, sourceFile: ts.SourceFile): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  throw expressionError(name, sourceFile, 'computed property names are not statically supported');
}

function hasExportModifier(statement: ts.VariableStatement): boolean {
  return statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function expressionError(node: ts.Node, sourceFile: ts.SourceFile, message: string): Error {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return new Error(`${message} at ${position.line + 1}:${position.character + 1}`);
}

function scriptKindFor(fileName: string): ts.ScriptKind {
  if (/\.tsx$/i.test(fileName)) return ts.ScriptKind.TSX;
  if (/\.(?:js|mjs|cjs)$/i.test(fileName)) return ts.ScriptKind.JS;
  if (/\.jsx$/i.test(fileName)) return ts.ScriptKind.JSX;
  return ts.ScriptKind.TS;
}
