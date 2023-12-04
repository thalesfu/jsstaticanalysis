import File from "../staticanalysis/file";
import ts, {SyntaxKind} from "typescript";
import {PrintColors} from "../utils/printcolor";
import path from "path";
import crypto from "crypto";
import lo from "lodash";
import fs from "fs";

export class TSClassDeclaration {
    private _filePath: string = "";
    private _name: string = "";
    private _hash: string = "";
    private _dependentHash: string = "";
    private _isExported: boolean = false;
    private _isDefaultExport: boolean = false;
    private _isAbstract: boolean = false;
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

    get isAbstract(): boolean {
        return this._isAbstract;
    }

    set isAbstract(value: boolean) {
        this._isAbstract = value;
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
            isabsolute: this.isAbstract,
            heritage: this.heritage,
        };
    }
}

export function buildClass(file: File, n: ts.ClassDeclaration): TSClassDeclaration | undefined {
    if (!n.name) {
        console.log(PrintColors.red, "ClassDeclaration without name: " + n.getText(), PrintColors.reset);
        return undefined
    }
    const p = path.relative(file.root.location, file.location)

    const tsClassDeclaration = new TSClassDeclaration();

    tsClassDeclaration.filePath = p;
    tsClassDeclaration.name = n.name.getText();

    const hash = crypto.createHash('sha512');
    hash.update(tsClassDeclaration.filePath);
    hash.update(tsClassDeclaration.name);
    hash.update(n.getText());
    tsClassDeclaration.hash = hash.digest('base64')

    if (n.modifiers) {
        for (const modifier of n.modifiers) {
            switch (modifier.kind) {
                case  SyntaxKind.AbstractKeyword:
                    tsClassDeclaration.isAbstract = true;
                    break;
                case SyntaxKind.DefaultKeyword:
                    tsClassDeclaration.isDefaultExport = true;
                    break;
                case SyntaxKind.ExportKeyword:
                    tsClassDeclaration.isExported = true;
                    break;
            }
        }
    }

    if (n.heritageClauses) {
        const heritages: string[] = [];
        for (const heritageClause of n.heritageClauses) {
            heritages.push(heritageClause.getText())
        }

        tsClassDeclaration.heritage = heritages.join(", ");
    }

    return tsClassDeclaration;
}

export function saveClassesFile(classDeclarations: TSClassDeclaration[]) {

    console.log("save " + classDeclarations.length + " classes to file")

    const data = lo.groupBy(classDeclarations, (item) => item.filePath);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsclassdeclarations.json", jsonStr, "utf-8")
}