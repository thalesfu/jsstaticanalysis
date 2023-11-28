import fs from "fs";
import * as path from "path";
import Repository from "../staticanalysis/repository";
import {TSCodeImport} from "./tscodeimport";
import crypto from "crypto";
import lo from "lodash";
import {TSClassDeclaration} from "./tsclassdeclaration";
import ts, {ClassDeclaration, SyntaxKind} from "typescript";
import {PrintColors} from "../utils/printcolor";
import File from "../staticanalysis/file";


export function getSyntaxKindName(sln: ts.Node) {
    if (sln.kind === 243) {
        return "VariableStatement";
    }
    return SyntaxKind[sln.kind];
}

export function buildTSCodeImports(repo: Repository) {

    const imports: TSCodeImport[] = [];

    for (const file of repo.files.values()) {
        const p = path.relative(file.root.location, file.location)
        if (!(p.endsWith(".ts") || p.endsWith(".tsx"))) {
            continue;
        }

        for (const impt of file.imports.values()) {
            const tsCodeImport = new TSCodeImport();

            tsCodeImport.filePath = p;
            tsCodeImport.name = impt.name;
            tsCodeImport.importFrom = impt.fromString

            const hash = crypto.createHash('sha512');
            hash.update(tsCodeImport.filePath);
            hash.update(tsCodeImport.name);
            hash.update(impt.ast.getText());
            tsCodeImport.hash = hash.digest('base64')

            imports.push(tsCodeImport);
        }
    }

    const data = lo.groupBy(imports, (impt) => impt.filePath);


    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsimportdeclarations.json", jsonStr, "utf-8")
}

export function buildDeclaration(repo: Repository) {
    const classDeclarations: TSClassDeclaration[] = [];

    for (const file of repo.files.values()) {
        if (!(file.location.endsWith(".ts") || file.location.endsWith(".tsx"))) {
            continue;
        }

        for (const fn of file.ast.getChildren()) {
            if (fn.kind === SyntaxKind.SyntaxList) {
                for (const n of fn.getChildren()) {
                    if (ts.isClassDeclaration(n)) {
                        const c = buildClass(file, n);
                        if (c) {
                            classDeclarations.push(c);
                        }
                    }
                }
            }
        }
    }

    const data = lo.groupBy(classDeclarations, (item) => item.filePath);


    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsclassdeclarations.json", jsonStr, "utf-8")
}

function buildClass(file: File, n: ts.ClassDeclaration): TSClassDeclaration | undefined {
    if (!n.name) {
        console.log(PrintColors.red, "ClassDeclaration without name: " + n.getText(), PrintColors.reset);
        return undefined
    }
    const p = path.relative(file.root.location, file.location)

    const tsClassDeclaration = new TSClassDeclaration();

    tsClassDeclaration.filePath = p;
    tsClassDeclaration.name = n.name.getText();

    const hash = crypto.createHash('sha512');
    hash.update(tsClassDeclaration.filePath);
    hash.update(tsClassDeclaration.name);
    hash.update(n.getText());
    tsClassDeclaration.hash = hash.digest('base64')

    if (n.modifiers) {
        for (const modifier of n.modifiers) {
            switch (modifier.kind) {
                case  SyntaxKind.AbstractKeyword:
                    tsClassDeclaration.isAbstract = true;
                    break;
                case SyntaxKind.DefaultKeyword:
                    tsClassDeclaration.isDefaultExport = true;
                    break;
                case SyntaxKind.ExportKeyword:
                    tsClassDeclaration.isExported = true;
                    break;
            }
        }
    }

    if (n.heritageClauses) {
        const heritages: string[] = [];
        for (const heritageClause of n.heritageClauses) {
            heritages.push(heritageClause.getText())
        }

        tsClassDeclaration.heritage = heritages.join(", ");
    }

    return tsClassDeclaration;
}