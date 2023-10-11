import ts from "typescript";
import exp from "constants";
import Class from "./class";
import Variable from "./variable";
import {it} from "node:test";

export function visitAllChildren(node: ts.Node, callback: (node: ts.Node) => boolean) {
    const ok = callback(node);
    if (ok) {
        ts.forEachChild(node, child => visitAllChildren(child, callback));
    }
}

export function isRelateImport(from: string): boolean {
    return from.startsWith("./") || from.startsWith("../");
}

export function isAbsoluteImport(from: string): boolean {
    return from.startsWith("~/");
}

export function findJSX(item: Class | Variable): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
    if (item instanceof Variable) {
        for (const b of item.base.values()) {
            if (b instanceof Class || b instanceof Variable) {
                const j = findJSX(b);
                if (j) {
                    return j;
                }
            }
        }

        return undefined;
    }

    const rt = findRenderReturn(item.ast);

    if (!rt) {
        return undefined;
    }

    return extractJSX(rt);
}

export function findRenderReturn(node: ts.ClassDeclaration) {
    for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name) && member.name.text === "render") {
            for (const statement of member.body!.statements) {
                if (ts.isReturnStatement(statement) && statement.expression) {
                    return statement.expression;
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

    return undefined;
}