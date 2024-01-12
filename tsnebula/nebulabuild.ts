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
import {buildInterface, saveInterfacesFile, TSInterfaceDeclaration} from "./tsinterfacedeclaration";
import {buildTypeAlias, saveTypeAliasFile, TSTypeAliasDeclaration} from "./tstypealiasdeclaration";
import {buildFunction, saveFunctionFile, TSFunctionDeclaration} from "./tsfunctiondeclaration";


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
    const interfaces: TSInterfaceDeclaration[] = [];
    const typeAlias: TSTypeAliasDeclaration[] = [];
    const functions: TSFunctionDeclaration[] = [];

    for (const file of repo.files.values()) {
        if (!(file.location.endsWith(".ts") || file.location.endsWith(".tsx"))) {
            continue;
        }

        const fileEnumMembers: TSEnumMember[] = [];
        let enumFilePath = ""
        for (const fn of file.ast.getChildren()) {
            if (fn.kind === SyntaxKind.SyntaxList) {

                const filter = lo.flatMap(fn.getChildren(), (n) => {
                    const result: string[] = [];
                    if (ts.isExportDeclaration(n)) {
                        if (n.exportClause && !n.moduleSpecifier) {
                            if (ts.isNamedExports(n.exportClause)) {
                                for (const ne of n.exportClause.elements) {
                                    result.push(ne.getText());
                                }
                            } else {
                                console.log(PrintColors.red, "exportClause is not NamedExports: " + file.location + "\t" + n.exportClause.getText(), PrintColors.reset);
                            }
                        } else if (n.moduleSpecifier) {
                            console.log(PrintColors.red, "module specifier is not null: " + file.location + "\t" + n.getText(), PrintColors.reset);
                        } else {
                            console.log(PrintColors.red, "exportClause is null: " + file.location + "\t" + n.getText(), PrintColors.reset);
                        }
                    }

                    return result;
                });

                const exports = new Set(filter);

                for (const n of fn.getChildren()) {
                    if (ts.isClassDeclaration(n)) {
                        const c = buildClass(file, n, exports);
                        if (c) {
                            classDeclarations.push(c);
                        }
                    } else if (ts.isImportDeclaration(n)) {
                        imports.push(...buildImports(file, n));
                    } else if (ts.isEnumDeclaration(n)) {
                        const e = buildEnums(file, n, exports);
                        enums.push(e);
                        enumFilePath = e.filePath;
                        fileEnumMembers.push(...buildEnumMembers(file, n));
                    } else if (ts.isVariableStatement(n)) {
                        vars.push(...buildVariables(file, n, exports));
                    } else if (ts.isInterfaceDeclaration(n)) {
                        const i = buildInterface(file, n, exports);
                        if (i) {
                            interfaces.push(i);
                        }
                    } else if (ts.isTypeAliasDeclaration(n)) {
                        typeAlias.push(buildTypeAlias(file, n, exports));
                    } else if (ts.isFunctionDeclaration(n)) {
                        const f = buildFunction(file, n, exports);
                        if (f) {
                            functions.push(f);
                        }
                    }
                }

                if (exports.size > 0) {
                    console.log(PrintColors.red, "export not found: " + file.location + "\t" + Array.from(exports).join(", "), PrintColors.reset);
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
    saveInterfacesFile(interfaces);
    saveTypeAliasFile(typeAlias);
    saveFunctionFile(functions);
}