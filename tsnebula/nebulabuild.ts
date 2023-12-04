import fs from "fs";
import * as path from "path";
import Repository from "../staticanalysis/repository";
import {buildImports, saveImportsFile, TsImportDeclaration} from "./tsimportdeclaration";
import crypto from "crypto";
import lo from "lodash";
import {buildClass, saveClassesFile, TSClassDeclaration} from "./tsclassdeclaration";
import ts, {ClassDeclaration, SyntaxKind} from "typescript";
import {PrintColors} from "../utils/printcolor";
import File from "../staticanalysis/file";
import {buildEnums, saveEnumsFile, TSEnumDeclaration} from "./tsenumdeclaration";
import {buildEnumMembers, saveEnumsMembersFile, TSEnumMember} from "./tsenummember";
import {buildVariables, saveVariableFile, TSVariableDeclaration} from "./tsvariabledeclaration";


export function getSyntaxKindName(sln: ts.Node) {
    if (sln.kind === 243) {
        return "VariableStatement";
    }

    if (sln.kind === 9) {
        return "NumericLiteral";
    }

    return SyntaxKind[sln.kind];
}

export function buildDeclaration(repo: Repository) {
    const classDeclarations: TSClassDeclaration[] = [];
    const imports: TsImportDeclaration[] = [];
    const enums: TSEnumDeclaration[] = [];
    const enumsMembers: Map<string, lo.Dictionary<TSEnumMember[]>> = new Map<string, lo.Dictionary<TSEnumMember[]>>();
    const vars: TSVariableDeclaration[] = [];

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
                    } else if (ts.isVariableStatement(n)) {
                        vars.push(...buildVariables(file, n));
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
    saveVariableFile(vars);
}