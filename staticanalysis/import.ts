import ts from "typescript";
import File from "./file"

export class Import {
    private readonly _name: string;
    private readonly _ast: ts.ImportDeclaration;
    private readonly _file: File;
    private readonly _from: string;

    constructor(name: string, ast: ts.ImportDeclaration, file: File) {
        this._name = name;
        this._ast = ast;
        this._file = file;
        this._from = ast.moduleSpecifier.getText().replace(/["']/g, "");
    }

    public get name(): string {
        return this._name;
    }

    public get ast(): ts.ImportDeclaration {
        return this._ast;
    }

    public get file(): File {
        return this._file;
    }

    public get from(): string {
        return this._from;
    }

    public get isCRNPage(): boolean {
        return this._from === "@ctrip/crn" && this._name === "Page";
    }
}

export default Import;