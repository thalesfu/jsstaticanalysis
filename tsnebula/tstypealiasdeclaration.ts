import File from "../staticanalysis/file";
import ts, {NodeFlags, SyntaxKind} from "typescript";
import path from "path";
import crypto from "crypto";
import lo from "lodash";
import fs from "fs";

export class TSTypeAliasDeclaration {
    private _filePath: string = "";
    private _name: string = "";
    private _hash: string = "";
    private _dependentHash: string = "";
    private _isExported: boolean = false;
    private _typeParameters: string = "";
    private _types: string = "";

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

    get typeParameters(): string {
        return this._typeParameters;
    }

    set typeParameters(value: string) {
        this._typeParameters = value;
    }

    get types(): string {
        return this._types;
    }

    set types(value: string) {
        this._types = value;
    }

    toJSON() {
        return {
            filePath: this.filePath,
            name: this.name,
            hash: this.hash,
            isexport: this.isExported,
            typeParameters: this.typeParameters,
            types: this.types,
        };
    }
}

export function buildTypeAlias(file: File, n: ts.TypeAliasDeclaration, exports: Set<string>): TSTypeAliasDeclaration {
    const ta = new TSTypeAliasDeclaration();

    const p = path.relative(file.root.location, file.location);

    ta.filePath = p;
    ta.name = n.name.getText();

    const hash = crypto.createHash('sha512');
    hash.update(ta.filePath);
    hash.update(ta.name);
    hash.update(n.getText());
    ta.hash = hash.digest('base64')



    if (n.modifiers) {
        for (const modifier of n.modifiers) {
            switch (modifier.kind) {
                case SyntaxKind.ExportKeyword:
                    ta.isExported = true;
                    break;
            }
        }
    }

    if (!ta.isExported) {
        if (exports.has(ta.name)) {
            ta.isExported = true;
            exports.delete(ta.name);
        }
    }

    if (n.typeParameters) {
        const tps: string[] = [];

        for (const tp of n.typeParameters) {
            tps.push(tp.getText());
        }

        ta.typeParameters = tps.join(", ");
    } else {
        ta.typeParameters = "";
    }

    ta.types = n.type.getText() ?? ""

    return ta;
}

export function saveTypeAliasFile(vars: TSTypeAliasDeclaration[]) {
    console.log("save " + vars.length + " type alias to file")

    const data = lo.groupBy(vars, (item) => item.filePath);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tstypealiasdeclarations.json", jsonStr, "utf-8")
}