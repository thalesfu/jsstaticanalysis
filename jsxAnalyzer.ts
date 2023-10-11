import ts from 'typescript';
import * as fs from 'fs';
import Repository from "./staticanalysis/repository";
import Package from "./staticanalysis/package";
import Class from "./staticanalysis/class";
import Interface from "./staticanalysis/interface";
import Variable from "./staticanalysis/variable";
import TypeAlias from "./staticanalysis/typealias";

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

// const map = new Map<string, Package>();
// getDependentPackages(repo.packages.get("@types/react")!, map);
// map.forEach((pkg) => {
//     console.log(`Package ${pkg.name}@${pkg.version}`);
// });

// printBeDependents(repo.packages.get("react")!, 0);

function printBeTypeDependents(pkg: Package, indentLevel: number) {
    console.log(`${" ".repeat(indentLevel * 4)}${pkg.name}@${pkg.version}`);
    pkg.beTypeDependents.forEach((dep) => {
        printBeTypeDependents(dep, indentLevel + 1);
    });
}

function printBeDependents(pkg: Package, indentLevel: number) {
    console.log(`${" ".repeat(indentLevel * 4)}${pkg.name}@${pkg.version}`);
    pkg.beDependents.forEach((dep) => {
        printBeDependents(dep, indentLevel + 1);
    });
}

function getDependentPackages(pkg: Package, map: Map<string, Package>) {
    map.set(pkg.name, pkg);
    pkg.beDependents?.forEach((dep) => {
        if (!map.has(dep.name)) {
            getDependentPackages(dep, map);
        }
    });
}

// function printDeclares(pkg: Package) {
//     console.log(`${pkg.name}@${pkg.version}`);
//     pkg.files.forEach((f) => {
//         f.classes.forEach((c, cn) => {
//             console.log(`\tClass: ${c.name} ${c.isExport ? "is export" : "is not export"} at ${c?.file.location}`);
//             c.extends.forEach((e, en) => {
//                 console.log(`\t\tExtend: ${en}`);
//             });
//             c.implements.forEach((i, iname) => {
//                 console.log(`\t\tImplement: ${iname}`);
//             });
//         });
//     });
// }

function printBeDependentOns(cls: Class | Interface | Variable | TypeAlias, indentLevel: number) {
    console.log(`${" ".repeat(indentLevel * 4)}${cls.name} from ${cls.file?.parent?.path} at ${cls.file?.location}` );
    cls.beDependedOn.forEach((dep) => {
        printBeDependentOns(dep, indentLevel + 1);
    });
}

const component = repo.packages.get("@types/react")?.classes.get("Component");

printBeDependentOns(component!, 0);