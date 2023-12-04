import File from "../staticanalysis/file";
import ts from "typescript";
import path from "path";
import crypto from "crypto";
import lo from "lodash";
import fs from "fs";

export class TsImportDeclaration {
    private _filePath: string = "";
    private _name: string = "";
    private _hash: string = "";
    private _dependentHash: string = "";
    private _importFrom: string = "";
    private _importType: string = "";


    get filePath(): string {
        return this._filePath;
    }

    set filePath(value: string) {
        this._filePath = value;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get importFrom(): string {
        return this._importFrom;
    }

    set importFrom(value: string) {
        this._importFrom = value;
    }

    get hash(): string {
        return this._hash;
    }

    set hash(value: string) {
        this._hash = value;
    }

    get dependentHash(): string {
        return this._dependentHash;
    }

    set dependentHash(value: string) {
        this._dependentHash = value;
    }


    get importType(): string {
        return this._importType;
    }

    set importType(value: string) {
        this._importType = value;
    }

    toJSON() {
        return {
            filePath: this.filePath,
            name: this.name,
            importFrom: this.importFrom,
            hash: this.hash,
            importType: this.importType,
        };
    }
}

export function buildImports(file: File, n: ts.ImportDeclaration): TsImportDeclaration[] {
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

export

function saveImportsFile(imports: TsImportDeclaration[]) {
    console.log("save " + imports.length + " imports to file")

    const data = lo.groupBy(imports, (item) => item.filePath);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsimportdeclarations.json", jsonStr, "utf-8")
}