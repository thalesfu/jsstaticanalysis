import fs from "fs";
import * as path from "path";
import Repository from "../staticanalysis/repository";
import {TSCodeImport} from "./tscodeimport";
import crypto from "crypto";
import lo from "lodash";

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
            hash.update(file.path);
            hash.update(impt.name);
            hash.update(impt.ast.getText());
            tsCodeImport.hash = hash.digest('base64')

            imports.push(tsCodeImport);
        }
    }

    const data = lo.groupBy(imports, (impt) => impt.filePath);


    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tscodeimport.json", jsonStr, "utf-8")
}