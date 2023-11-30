import fs from "fs";
import * as path from "path";
import Repository from "../staticanalysis/repository";
import {TsImportDeclaration} from "./tsImportDeclaration";
import crypto from "crypto";
import lo from "lodash";
import {TSClassDeclaration} from "./tsclassdeclaration";
import ts, {ClassDeclaration, SyntaxKind} from "typescript";
import {PrintColors} from "../utils/printcolor";
import File from "../staticanalysis/file";
import {TSEnumDeclaration} from "./tsenumdeclaration";
import {TSEnumMember} from "./tsenummember";


export function getSyntaxKindName(sln: ts.Node) {
    if (sln.kind === 243) {
        return "VariableStatement";
    }

    if (sln.kind === 9) {
        return "NumericLiteral";
    }

    return SyntaxKind[sln.kind];
}

function saveClassesFile(classDeclarations: TSClassDeclaration[]) {

    console.log("save " + classDeclarations.length + " classes to file")

    const data = lo.groupBy(classDeclarations, (item) => item.filePath);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsclassdeclarations.json", jsonStr, "utf-8")
}

function saveImportsFile(imports: TsImportDeclaration[]) {
    console.log("save " + imports.length + " imports to file")

    const data = lo.groupBy(imports, (item) => item.filePath);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsimportdeclarations.json", jsonStr, "utf-8")
}

function saveEnumsFile(enums: TSEnumDeclaration[]) {
    console.log("save " + enums.length + " enums to file")

    const data = lo.groupBy(enums, (item) => item.filePath);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsenumdeclarations.json", jsonStr, "utf-8")
}

function saveEnumsMembersFile(enumsMembers: Map<string, lo.Dictionary<TSEnumMember[]>>) {

   const data = Object.fromEntries(enumsMembers);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsenummembers.json", jsonStr, "utf-8")
}

function buildEnums(file: File, n: ts.EnumDeclaration): TSEnumDeclaration {
    const e = new TSEnumDeclaration();

    e.filePath = path.relative(file.root.location, file.location);
    e.name = n.name.getText();

    const hash = crypto.createHash('sha512');
    hash.update(e.filePath);
    hash.update(e.name);
    hash.update(n.getText());
    e.hash = hash.digest('base64')

    if (n.modifiers) {
        for (const modifier of n.modifiers) {
            switch (modifier.kind) {
                case SyntaxKind.DefaultKeyword:
                    e.isDefaultExport = true;
                    break;
                case SyntaxKind.ExportKeyword:
                    e.isExported = true;
                    break;
            }
        }
    }

    return e;
}

function buildEnumMembers(file: File, n: ts.EnumDeclaration): TSEnumMember[] {
    const members: TSEnumMember[] = [];

    const p = path.relative(file.root.location, file.location);

    for (const member of n.members) {
        const m = new TSEnumMember();
        m.filePath = p;
        m.name = n.name.getText() + "." + member.name.getText();
        const hash = crypto.createHash('sha512');
        hash.update(m.filePath);
        hash.update(m.name);
        hash.update(member.getText());
        m.hash = hash.digest('base64')

        m.enum = n.name.getText();
        m.member = member.name.getText();

        if (member.initializer) {
            m.value = member.initializer.getText().replace(/["']/g, "");
            if (member.initializer.kind === SyntaxKind.StringLiteral) {
                m.value_type = "string";
            } else {
                m.value_type = "number";
            }
        } else {
            m.value_type = "undefined";
        }

        members.push(m);
    }

    return members;
}

export function buildDeclaration(repo: Repository) {
    const classDeclarations: TSClassDeclaration[] = [];
    const imports: TsImportDeclaration[] = [];
    const enums: TSEnumDeclaration[] = [];
    const enumsMembers: Map<string, lo.Dictionary<TSEnumMember[]>> = new Map<string, lo.Dictionary<TSEnumMember[]>>();

    for (const file of repo.files.values()) {
        if (!(file.location.endsWith(".ts") || file.location.endsWith(".tsx"))) {
            continue;
        }

        const fileEnumMembers: TSEnumMember[] = [];
        let enumFilePath = ""
        for (const fn of file.ast.getChildren()) {
            if (fn.kind === SyntaxKind.SyntaxList) {
                for (const n of fn.getChildren()) {
                    if (ts.isClassDeclaration(n)) {
                        const c = buildClass(file, n);
                        if (c) {
                            classDeclarations.push(c);
                        }
                    } else if (ts.isImportDeclaration(n)) {
                        imports.push(...buildImports(file, n));
                    } else if (ts.isEnumDeclaration(n)) {
                        const e = buildEnums(file, n);
                        enums.push(e);
                        enumFilePath = e.filePath;
                        fileEnumMembers.push(...buildEnumMembers(file, n));
                    }
                }
            }
        }

        if (fileEnumMembers.length > 0) {
            const group = lo.groupBy(fileEnumMembers, (item) => item.enum);
            enumsMembers.set(enumFilePath, group);
        }
    }

    saveClassesFile(classDeclarations);
    saveImportsFile(imports);
    saveEnumsFile(enums);
    saveEnumsMembersFile(enumsMembers);
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

function buildImports(file: File, n: ts.ImportDeclaration): TsImportDeclaration[] {
    const imports: TsImportDeclaration[] = [];

    const p = path.relative(file.root.location, file.location)

    let fromString = "";

    if (n.moduleSpecifier) {
        fromString = n.moduleSpecifier.getText().replace(/["']/g, "");
    }

    if (n.importClause) {
        if (n.importClause.name) {
            const i = new TsImportDeclaration();
            i.filePath = p;
            i.name = n.importClause.name.getText();
            i.importFrom = fromString;
            i.importType = "default";
            const hash = crypto.createHash('sha512');
            hash.update(i.filePath);
            hash.update(i.name);
            hash.update(n.getText());
            i.hash = hash.digest('base64')
            imports.push(i);
        }

        if (n.importClause.namedBindings) {
            if (ts.isNamedImports(n.importClause.namedBindings)) {
                for (const e of n.importClause.namedBindings.elements) {
                    const i = new TsImportDeclaration();
                    i.filePath = p;
                    i.name = e.getText()
                    i.importFrom = fromString;
                    i.importType = "named";
                    const hash = crypto.createHash('sha512');
                    hash.update(i.filePath);
                    hash.update(i.name);
                    hash.update(n.getText());
                    i.hash = hash.digest('base64')
                    imports.push(i);
                }
            } else if (ts.isNamespaceImport(n.importClause.namedBindings)) {
                const i = new TsImportDeclaration();
                i.filePath = p;
                i.name = n.importClause.namedBindings.name.getText()
                i.importFrom = fromString;
                i.importType = "namespace";
                const hash = crypto.createHash('sha512');
                hash.update(i.filePath);
                hash.update(i.name);
                hash.update(n.getText());
                i.hash = hash.digest('base64')
                imports.push(i);
            }
        }
    }

    return imports;
}