import File from "../staticanalysis/file";
import ts, {SyntaxKind} from "typescript";
import {PrintColors} from "../utils/printcolor";
import path from "path";
import crypto from "crypto";
import lo from "lodash";
import fs from "fs";

export class TSInterfaceDeclaration {
    private _filePath: string = "";
    private _name: string = "";
    private _hash: string = "";
    private _dependentHash: string = "";
    private _isExported: boolean = false;
    private _isDefaultExport: boolean = false;
    private _typeParameter: string = "";
    private _heritage: string = "";


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


    get typeParameter(): string {
        return this._typeParameter;
    }

    set typeParameter(value: string) {
        this._typeParameter = value;
    }

    get heritage(): string {
        return this._heritage;
    }

    set heritage(value: string) {
        this._heritage = value;
    }

    toJSON() {
        return {
            filePath: this.filePath,
            name: this.name,
            hash: this.hash,
            isexport: this.isExported,
            isdefaultexport: this.isDefaultExport,
            typeParameter: this.typeParameter,
            heritage: this.heritage,
        };
    }
}

export function buildInterface(file: File, n: ts.InterfaceDeclaration, exports: Set<string>): TSInterfaceDeclaration | undefined {
    if (!n.name) {
        console.log(PrintColors.red, "InterfaceDeclaration without name: " + n.getText(), PrintColors.reset);
        return undefined
    }
    const p = path.relative(file.root.location, file.location)

    const t = new TSInterfaceDeclaration();

    t.filePath = p;
    t.name = n.name.getText();

    const hash = crypto.createHash('sha512');
    hash.update(t.filePath);
    hash.update(t.name);
    hash.update(n.getText());
    t.hash = hash.digest('base64')

    if (n.modifiers) {
        for (const modifier of n.modifiers) {
            switch (modifier.kind) {
                case SyntaxKind.DefaultKeyword:
                    t.isDefaultExport = true;
                    break;
                case SyntaxKind.ExportKeyword:
                    t.isExported = true;
                    break;
            }
        }
    }

    if (!t.isExported) {
        if(exports.has(t.name)) {
            t.isExported = true;
            exports.delete(t.name);
        }
    }

    if (n.typeParameters) {
        const typeParameters: string[] = [];
        for (const typeParameter of n.typeParameters) {
            typeParameters.push(typeParameter.getText())
        }

        t.typeParameter = typeParameters.join(", ");
    }

    if (n.heritageClauses) {
        const heritages: string[] = [];
        for (const heritageClause of n.heritageClauses) {
            heritages.push(heritageClause.getText())
        }

        t.heritage = heritages.join(", ");
    }

    return t;
}

export function saveInterfacesFile(interfaceDeclarations: TSInterfaceDeclaration[]) {

    console.log("save " + interfaceDeclarations.length + " interface to file")

    const data = lo.groupBy(interfaceDeclarations, (item) => item.filePath);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsinterfacedeclarations.json", jsonStr, "utf-8")
}