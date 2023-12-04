import File from "../staticanalysis/file";
import ts, {NodeFlags, SyntaxKind} from "typescript";
import path from "path";
import crypto from "crypto";
import lo from "lodash";
import fs from "fs";

export class TSVariableDeclaration {
    private _filePath: string = "";
    private _name: string = "";
    private _hash: string = "";
    private _dependentHash: string = "";
    private _isExported: boolean = false;
    private _flag: string = "";
    private _variableType: string = "";

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


    get flag(): string {
        return this._flag;
    }

    set flag(value: string) {
        this._flag = value;
    }

    get variableType(): string {
        return this._variableType;
    }

    set variableType(value: string) {
        this._variableType = value;
    }

    toJSON() {
        return {
            filePath: this.filePath,
            name: this.name,
            hash: this.hash,
            isexport: this.isExported,
            flag: this.flag,
            variableType: this.variableType,
        };
    }
}

export function buildVariables(file: File, n: ts.VariableStatement): TSVariableDeclaration[] {
    if (!n.declarationList?.declarations) {
        return [];
    }

    const result: TSVariableDeclaration[] = [];
    const p = path.relative(file.root.location, file.location);

    let isExported = false;

    if (n.modifiers) {
        for (const modifier of n.modifiers) {
            switch (modifier.kind) {
                case SyntaxKind.ExportKeyword:
                    isExported = true;
                    break;
            }
        }
    }

    for (const d of n.declarationList.declarations) {
        const e = new TSVariableDeclaration();

        e.filePath = p;
        e.name = d.name.getText();

        const hash = crypto.createHash('sha512');
        hash.update(e.filePath);
        hash.update(e.name);
        hash.update(d.getText());
        e.hash = hash.digest('base64')

        e.isExported = isExported;
        switch (d.parent.flags) {
            case NodeFlags.Const:
                e.flag = "const";
                break;
            case NodeFlags.Let:
                e.flag = "let";
                break;
            default:
                e.flag = "";
                break;
        }

        if (d.initializer) {
            if (ts.isArrowFunction(d.initializer)) {
                e.variableType = "ArrowFunction";
            } else if (ts.isCallExpression(d.initializer)) {
                e.variableType = "CallExpression";
            } else if (ts.isObjectLiteralExpression(d.initializer)) {
                e.variableType = "ObjectExpression";
            } else if (ts.isConditionalExpression(d.initializer)) {
                e.variableType = "ConditionExpression";
            } else if (ts.isAsExpression(d.initializer)) {
                e.variableType = "AsExpression";
            } else if (ts.isBinaryExpression(d.initializer)) {
                e.variableType = "BinaryExpression";
            } else if (ts.isStringLiteral(d.initializer)) {
                e.variableType = "StringLiteral";
            } else if (ts.isNumericLiteral(d.initializer)) {
                e.variableType = "NumericLiteral";
            } else if (ts.isPropertyAccessExpression(d.initializer)) {
                e.variableType = "PropertyAccessExpression";
            } else if (ts.isArrayLiteralExpression(d.initializer)) {
                e.variableType = "ArrayLiteralExpression";
            }
        } else {
            if (d.type) {
                e.variableType = "ObjectTypeLiteral"
            }
        }

        if (!e.variableType) {
            continue
        }

        result.push(e)
    }

    return result;
}

export function saveVariableFile(vars: TSVariableDeclaration[]) {
    console.log("save " + vars.length + " variable to file")

    const data = lo.groupBy(vars, (item) => item.filePath);

    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync("dist/tsvarsdeclarations.json", jsonStr, "utf-8")
}