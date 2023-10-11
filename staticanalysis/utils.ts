import ts from "typescript";

export function visitAllChildren(node: ts.Node, callback: (node: ts.Node) => boolean) {
    const ok = callback(node);
    if (ok) {
        ts.forEachChild(node, child => visitAllChildren(child, callback));
    }
}

export function isRelateImport(from: string): boolean {
    return from.startsWith("./") || from.startsWith("../");
}