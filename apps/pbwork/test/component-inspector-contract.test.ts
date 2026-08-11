import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseSfc } from "vue/compiler-sfc";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { componentRecords } from "@/design-system/components/registry";

function propertyName(node: ts.PropertyName): string | null {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return null;
}

function returnedObject(
  initializer: ts.Expression,
): ts.ObjectLiteralExpression | null {
  if (
    !ts.isArrowFunction(initializer) &&
    !ts.isFunctionExpression(initializer)
  ) {
    return null;
  }
  let body: ts.ConciseBody = initializer.body;
  while (ts.isParenthesizedExpression(body)) body = body.expression;
  if (ts.isObjectLiteralExpression(body)) return body;
  if (!ts.isBlock(body)) return null;

  let result: ts.ObjectLiteralExpression | null = null;
  function visit(node: ts.Node) {
    if (result) return;
    if (ts.isReturnStatement(node) && node.expression) {
      let expression = node.expression;
      while (ts.isParenthesizedExpression(expression)) {
        expression = expression.expression;
      }
      if (ts.isObjectLiteralExpression(expression)) result = expression;
    }
    ts.forEachChild(node, visit);
  }
  visit(body);
  return result;
}

function inspectBindingKeys(viewPath: string): string[] {
  const filename = resolve("src/design-system/components", viewPath);
  const source = readFileSync(filename, "utf8");
  const parsed = parseSfc(source, { filename });
  const script = [parsed.descriptor.script, parsed.descriptor.scriptSetup]
    .filter(Boolean)
    .map((block) => block!.content)
    .join("\n");
  const sourceFile = ts.createSourceFile(
    filename,
    script,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  let bindingObject: ts.ObjectLiteralExpression | null = null;
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      propertyName(node.name) === "getTokenBindings"
    ) {
      bindingObject = returnedObject(node.initializer);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (!bindingObject) {
    throw new Error(
      `${viewPath} must register getTokenBindings in usePbInspect`,
    );
  }
  const object = bindingObject as ts.ObjectLiteralExpression;
  return object.properties
    .map((property) => {
      if (
        ts.isPropertyAssignment(property) ||
        ts.isShorthandPropertyAssignment(property)
      ) {
        return propertyName(property.name);
      }
      return null;
    })
    .filter((key): key is string => Boolean(key))
    .sort();
}

describe("component Inspector and Contract consistency", () => {
  for (const component of componentRecords) {
    it(`${component.id} exposes the Contract token binding slots at runtime`, () => {
      const contract = JSON.parse(
        readFileSync(
          resolve("src/design-system/components", component.contract),
          "utf8",
        ),
      ) as { tokenBindings: Record<string, string> };
      expect(inspectBindingKeys(component.view)).toEqual(
        Object.keys(contract.tokenBindings).sort(),
      );
    });
  }
});
