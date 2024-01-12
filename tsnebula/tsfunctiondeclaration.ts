import File from "../staticanalysis/file";
import ts, {NodeFlags, SyntaxKind} from "typescript";
import path from "path";
import crypto from "crypto";
import lo from "lodash";
import fs from "fs";
import {TSTypeAliasDeclaration} from "./tstypealiasdeclaration";

export class TSFunctionDeclaration {
    private _filePath: string = "";
    private _name: string = "";
    private _hash: string = "";
    private _dependentHash: string = "";
    private _isExported: boolean = false;
    private _isDefaultExported: boolean = false;
    private _typeParameters: string = "";
    private _parameters: string = "";
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

    get isDefaultExported(): boolean {
        return this._isDefaultExported;
    }

    set isDefaultExported(value: boolean) {
        this._isDefaultExported = value;
    }

    get typeParameters(): string {
        return this._typeParameters;
    }

    set typeParameters(value: string) {
        this._typeParameters = value;
    }

    get parameters(): string {
        return this._parameters;
    }

    set parameters(value: string) {
        this._parameters = value;
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
            isdefaultexport: this.isDefaultExported,
            typeparameters: this.typeParameters,
            parameters: this.parameters,
            types: this.types,
        };
    }
}

export function buildFunction(file: File, n: ts.FunctionDeclaration, exports: Set<string>): TSFunctionDeclaration | undefined {
    if (!n.name) {
        throw undefined
    }

    const f = new TSFunctionDeclaration();

    const p = path.relative(file.root.location, file.location);

    f.filePath = p;
    f.name = n.name.getText();

    const hash = crypto.createHash('sha512');
    hash.update(f.filePath);
    hash.update(f.name);
    hash.update(n.getText());
    f.hash = hash.digest('base64')

    if (n.modifiers) {
        for (const modifier of n.modifiers) {
            switch (modifier.kind) {
                case SyntaxKind.ExportKeyword:
                    f.isExported = true;
                    break;
                case SyntaxKind.DefaultKeyword:
                    f.isDefaultExported = true;
                    break;
            }
        }
    }
    if (!f.isExported) {
        if (exports.has(f.name)) {
            f.isExported = true;
            exports.delete(f.name);
        }
    }

    if (n.typeParameters) {
        const tps: string[] = [];

        for (const tp of n.typeParameters) {
            tps.push(tp.getText());
        }

        f.typeParameters = tps.join(", ");
    } else {
        f.typeParameters = "";
    }

    if (n.parameters) {
        const ps: string[] = [];

        for (const p of n.parameters) {
            ps.push(p.getText());
        }

        f.parameters = ps.join(", ");
    }

    f.types = n.type?.getText() ?? ""

    return f;
}

export function saveFunctionFile(vars: TSFunctionDeclaration[]) {
    console.log("save " + vars.length + " function to file")

    const data = lo.groupBy(vars, (item) => item.filePath);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsfunctionsdeclarations.json", jsonStr, "utf-8")
}