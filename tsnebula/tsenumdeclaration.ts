import File from "../staticanalysis/file";
import ts, {SyntaxKind} from "typescript";
import path from "path";
import crypto from "crypto";
import lo from "lodash";
import fs from "fs";

export class TSEnumDeclaration {
    private _filePath: string = "";
    private _name: string = "";
    private _hash: string = "";
    private _dependentHash: string = "";
    private _isExported: boolean = false;
    private _isDefaultExport: boolean = false;

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


    get isExported(): boolean {
        return this._isExported;
    }

    set isExported(value: boolean) {
        this._isExported = value;
    }

    get isDefaultExport(): boolean {
        return this._isDefaultExport;
    }

    set isDefaultExport(value: boolean) {
        this._isDefaultExport = value;
    }

    toJSON() {
        return {
            filePath: this.filePath,
            name: this.name,
            hash: this.hash,
            isexport: this.isExported,
            isdefaultexport: this.isDefaultExport,
        };
    }
}

export function buildEnums(file: File, n: ts.EnumDeclaration, exports: Set<string>): TSEnumDeclaration {
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

    if (!e.isExported) {
        if (exports.has(e.name)) {
            e.isExported = true;
            exports.delete(e.name);
        }
    }

    return e;
}

export function saveEnumsFile(enums: TSEnumDeclaration[]) {
    console.log("save " + enums.length + " enums to file")

    const data = lo.groupBy(enums, (item) => item.filePath);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsenumdeclarations.json", jsonStr, "utf-8")
}