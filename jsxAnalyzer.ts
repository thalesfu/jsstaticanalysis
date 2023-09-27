import ts from 'typescript';
import * as fs from 'fs';
import Repository from "./repository";

function extractComponents(sourceCode: string): string[] {
    const sourceFile = ts.createSourceFile('temp.tsx', sourceCode, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TSX);

    let components: string[] = [];

    function visit(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.JsxSelfClosingElement || node.kind === ts.SyntaxKind.JsxOpeningElement) {
            const jsxElement = node as ts.JsxOpeningLikeElement;
            components.push(jsxElement.tagName.getText());
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    return [...new Set(components)];  // Removing duplicates
}

function analyzeFile(filePath: string) {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const components = extractComponents(sourceCode);
    console.log(`Components in ${filePath}:`, components);
}

const filePath = process.argv[2];

const repo = new Repository(filePath);
console.log(`Repo path: ${repo.getLocation()}`);
repo.getDependencies().forEach((pkg) => {
    console.log(`Package ${pkg.name}@${pkg.version}`);
});

repo.getDirectories().forEach((dir) => {
    console.log(`Directory ${dir.path} can import: ${dir.canImport}`);
});
