import ts from "typescript";
import exp from "constants";
import Class from "./class";
import Variable from "./variable";
import {it} from "node:test";
import ObjectBind from "./objectbind";

export function visitAllChildren(node: ts.Node, callback: (node: ts.Node) => boolean) {
    const ok = callback(node);
    if (ok) {
        ts.forEachChild(node, child => visitAllChildren(child, callback));
    }
}

export function isRelateImport(from: string): boolean {
    return from.startsWith("./") || from.startsWith("../") || from === ".";
}

export function isAbsoluteImport(from: string): boolean {
    return from.startsWith("~/");
}

export function findRenderJSX(item: Class | Variable | ObjectBind): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
    return findJSX(item, "render");
}

export function findJSX(item: Class | Variable | ObjectBind, method: string): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
    if (item instanceof Variable) {
        if (item.ast.initializer && ts.isArrowFunction(item.ast.initializer)) {
            return findArrowFunctionItemJSXByMethod(item.ast.initializer, method);
        }

        for (const b of item.base.values()) {
            if (b instanceof Class || b instanceof Variable || b instanceof ObjectBind) {
                const j = findJSX(b, method);
                if (j) {
                    return j;
                }
            }
        }

        return undefined;
    }

    if (item instanceof ObjectBind) {
        if (item.base) {
            const j = findJSX(item.base, method);
            if (j) {
                return j;
            }
        }

        return undefined;
    }

    return findClassItemJSXByMethod(item.ast, method);
}

export function findArrowFunctionItemJSXByMethod(ast: ts.ArrowFunction, method: string): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
    const rt = findArrowFunctionReturn(ast, method);

    if (!rt) {
        return undefined;
    }

    return extractJSX(rt);
}

export function findArrowFunctionReturn(node: ts.ArrowFunction, method: string): ts.Expression | undefined {
    if (ts.isBlock(node.body)) {
        for (const statement of node.body.statements) {
            if (ts.isReturnStatement(statement) && statement.expression) {
                return statement.expression;
            }
        }
    }

    return undefined
}

export function findClassItemJSXByMethod(ast: ts.ClassDeclaration, method: string): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
    const rt = findClassReturn(ast, method);

    if (!rt) {
        return undefined;
    }

    return extractJSX(rt);
}

export function findClassReturn(node: ts.ClassDeclaration, method: string): ts.Expression | undefined {
    for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name) && member.name.text === method) {
            for (const statement of member.body!.statements) {
                if (ts.isReturnStatement(statement) && statement.expression) {
                    return statement.expression;
                }
            }
        } else if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name) && member.name.text === method) {
            if (member.initializer) {
                if (ts.isArrowFunction(member.initializer)) {
                    if (ts.isBlock(member.initializer.body)) {
                        for (const statement of member.initializer.body.statements) {
                            if (ts.isReturnStatement(statement) && statement.expression) {
                                return statement.expression;
                            }
                        }
                    }
                }
            }
        }
    }

    return undefined
}

export function extractJSX(node: ts.Node): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        return node;
    }

    if (ts.isParenthesizedExpression(node)) {
        return extractJSX(node.expression);
    }

    if (ts.isConditionalExpression(node)) {
        return extractJSX(node.whenTrue) ?? extractJSX(node.whenFalse);
    }

    return undefined;
}