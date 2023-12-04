import Repository from "./staticanalysis/repository";
import {buildDeclaration, getSyntaxKindName} from "./tsnebula/nebulabuild";
import ts, {Node, SyntaxKind} from "typescript";
import fs from "fs";
import path from "path";
import {PrintColors} from "./utils/printcolor";
import lo from "lodash";

function getCurrentTimestamp(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000; // 获取本地时间与 UTC 的时差（以毫秒为单位）
    const localTime = new Date(now.getTime() - offset); // 转换为本地时间
    return localTime.toISOString().replace(/:/g, '_').replace(/\./g, '_').replace('T', '/').replace('Z', '');
}

function ensureDirectoryExistence(filePath: string) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    fs.mkdirSync(dirname, {recursive: true});
}

const logFilename = `logs/${getCurrentTimestamp()}.log`;
ensureDirectoryExistence(logFilename);
const logStream = fs.createWriteStream(logFilename, {flags: 'a'});
const logStdout = process.stdout;

console.log = function () {
    const message = Array.from(arguments).join(' ') + '\n';
    const messageWithoutAnsi = message.replace(/\x1B\[\d+m/g, '');
    logStream.write(messageWithoutAnsi);
    logStdout.write(message);
};

const filePath = process.argv[2];

const repo = new Repository(filePath);

// buildTSCodeImports(repo);

const nodes = new Map<string, number>();

const AddNode = (t: string) => {
    const cv = nodes.get(t);
    if (cv) {
        nodes.set(t, cv + 1);
    } else {
        nodes.set(t, 1);
    }
}

for (const file of repo.files.values()) {
    const p = path.relative(file.root.location, file.location)
    if (!(p.endsWith(".ts") || p.endsWith(".tsx"))) {
        continue;
    }

    for (const fn of file.ast.getChildren()) {
        if (fn.kind === SyntaxKind.SyntaxList) {

            const ns = fn.getChildren();

            const check = isVariableStatement_StringLiteral;

            const exist = lo.some(ns, (n) => {
                return check(n);
            });

            if (exist) {
                console.log(PrintColors.green, file.location, PrintColors.reset);
            }

            for (const sln of ns) {
                const syntaxKindElement = getSyntaxKindName(sln);

                if (ts.isVariableStatement(sln)) {
                    if (sln.declarationList && sln.declarationList.declarations) {
                        for (const d of sln.declarationList.declarations) {
                            if (d.initializer) {
                                AddNode(syntaxKindElement);
                            } else {
                                if (d.type) {
                                    AddNode(syntaxKindElement);
                                } else {
                                    AddNode(syntaxKindElement);
                                }
                            }
                        }
                    } else {
                        AddNode(syntaxKindElement);
                    }

                    continue
                }

                if (ts.isImportDeclaration(sln)) {
                    let detail = "\t";
                    if (sln.importClause) {
                        if (sln.importClause.name) {
                            AddNode(syntaxKindElement);
                        }

                        if (sln.importClause.namedBindings) {
                            if (ts.isNamedImports(sln.importClause.namedBindings)) {
                                const es: string[] = [];
                                for (const n of sln.importClause.namedBindings.elements) {
                                    AddNode(syntaxKindElement);
                                }
                            } else if (ts.isNamespaceImport(sln.importClause.namedBindings)) {
                                AddNode(syntaxKindElement);
                            }
                        }
                    }
                    continue
                }

                if (ts.isEnumDeclaration(sln)) {
                    AddNode(syntaxKindElement);
                    for (const member of sln.members) {
                        AddNode(getSyntaxKindName(member));
                    }
                    continue
                }

                AddNode(syntaxKindElement);
            }
        }
    }
}

for (const [k, v] of nodes.entries()) {
    console.log(`${k}: ${v}`)
}


buildDeclaration(repo);

function isVariableStatement_StringLiteral(node: Node): boolean {
    const check = ts.isArrayLiteralExpression;

    if (check(node)) {
        return true;
    }

    if (!ts.isVariableStatement(node)) {
        return false;
    }

    if (!node.declarationList?.declarations) {
        return false;
    }

    return lo.some(node.declarationList.declarations, (d) => {
        if (!d.initializer) {
            return false;
        }

        return check(d.initializer);
    })
}