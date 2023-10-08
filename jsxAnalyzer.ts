import ts from 'typescript';
import * as fs from 'fs';
import Repository from "./staticanalysis/repository";
import Package from "./staticanalysis/package";

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
console.log(`Repo path: ${repo.location}`);
// repo.dependencies().forEach((pkg) => {
//     console.log(`Package ${pkg.name}@${pkg.version}`);
// });

// repo.directories.forEach(dir => {
//     console.log(`Directory ${dir.path} can import: ${dir.canImport}`);
//
//     dir.files.forEach(file => {
//         console.log(`\tFile ${file.location}`);
//         file.imports.forEach((imp) => {
//             console.log(`\t\tImport ${imp.name} from ${imp.from}`);
//         });
//     });
// });

// repo.files.get("src/components/switch")?.imports.forEach((imp) => {
//     console.log(`\t\tImport ${imp.name} from ${imp.from}`);
// });

// repo.directories.forEach(dir => {
//     dir.files.forEach(file => {
//         file.imports.forEach((imp) => {
//             if (imp.isCRNPage) {
//                 console.log(`Import ${imp.name} from ${imp.from} at file ${file.location}`);
//             }
//         });
//     });
// });

// repo.crnPages.forEach((page) => {
//     console.log(`CRN Page ${page.name} at file ${page.file.location}`);
// });


// repo.GetTopologicalSortTypePackages().forEach((pkg) => {
//     console.log(`Package ${pkg.name}@${pkg.version}`);
//
//     pkg.typeDependencies.forEach((dep) => {
//         console.log(`\tType dependency ${dep.name}@${dep.version}`);
//     });
// });

printBeTypeDependents(repo.dependencies.get("@types/react")!,0);

function printBeTypeDependents(pkg: Package, indentLevel: number) {
    console.log(`${" ".repeat(indentLevel * 4)}${pkg.name}@${pkg.version}`);
    pkg.beTypeDependents.forEach((dep) => {
        printBeTypeDependents(dep, indentLevel + 1);
    });
}