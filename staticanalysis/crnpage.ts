import ts from "typescript";
import File from "./file"

export class CRNPage {
    private readonly _name: string;
    private readonly _ast: ts.ClassDeclaration;
    private readonly _file: File;

    constructor(ast: ts.ClassDeclaration, file: File) {
        this._name = ast.name?.text ?? "";
        this._ast = ast;
        this._file = file;
    }

    public get name(): string {
        return this._name;
    }

    public get ast(): ts.ClassDeclaration {
        return this._ast;
    }

    public get file(): File {
        return this._file;
    }
}

export default CRNPage;