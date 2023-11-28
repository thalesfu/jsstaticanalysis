import Repository from "./staticanalysis/repository";
import {buildDeclaration, buildTSCodeImports, getSyntaxKindName} from "./tsnebula/nebulabuild";
import ts, {SyntaxKind} from "typescript";
import fs from "fs";
import path from "path";
import {PrintColors} from "./utils/printcolor";

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
    fs.mkdirSync(dirname, { recursive: true });
}

const logFilename = `logs/${getCurrentTimestamp()}.log`;
ensureDirectoryExistence(logFilename);
const logStream = fs.createWriteStream(logFilename, { flags: 'a' });
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
buildDeclaration(repo);

// const nodes = new Map<string, number>();
//
// for (const file of repo.files.values()) {
//     const p = path.relative(file.root.location, file.location)
//     if (!(p.endsWith(".ts") || p.endsWith(".tsx"))) {
//         continue;
//     }
//
//     for (const fn of file.ast.getChildren()) {
//         if (fn.kind === SyntaxKind.SyntaxList) {
//             for (const sln of fn.getChildren()) {
//                 const syntaxKindElement = getSyntaxKindName(sln);
//                 const cv = nodes.get(syntaxKindElement);
//                 if (cv) {
//                     nodes.set(syntaxKindElement, cv + 1);
//                 } else {
//                     nodes.set(syntaxKindElement, 1);
//                 }
//
//                 if (sln.kind === SyntaxKind.ClassDeclaration) {
//                     console.log(PrintColors.cyan, file.location, PrintColors.reset);
//                     console.log()
//                     console.log(sln.getText());
//                     console.log()
//                 }
//             }
//         }
//     }
// }
//
// for (const [k, v] of nodes.entries()) {
//     console.log(`${k}: ${v}`)
// }