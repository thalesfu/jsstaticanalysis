import * as path from "path";
import ts from "typescript";
import fs from "fs";
import Directory from "./directory";
import Import from "./import";
import CRNPage from "./crnpage";

export class File {
    private readonly _name: string;
    private readonly _path: string;
    private readonly _location: string;
    private readonly _ast: ts.SourceFile;
    private readonly _directory: Directory;
    private readonly _imports: Map<string, Import> = new Map<string, Import>();
    private readonly _crnPage: Map<string, CRNPage> = new Map<string, CRNPage>();

    constructor(location: string, direct: Directory) {
        this._location = location;
        this._name = path.basename(location);
        this._directory = direct;
        this._path = path.join(direct.path, path.basename(location, path.extname(location)))
        this._ast = ts.createSourceFile(location, fs.readFileSync(location, 'utf-8'), ts.ScriptTarget.ES2015, true, ts.ScriptKind.TSX);
        this._imports = File.getImports(this);
        this._crnPage = File.getCRNPage(this);
    }

    public get name(): string {
        return this._name;
    }

    public get location(): string {
        return this._location;
    }

    public get path(): string {
        return this._path;
    }

    public get ast(): ts.SourceFile {
        return this._ast;
    }

    public get directory(): Directory {
        return this._directory;
    }

    public get imports(): Map<string, Import> {
        return this._imports;
    }

    public get crnPage(): Map<string, CRNPage> {
        return this._crnPage;
    }

    public IsCRNPage(ast: ts.ClassDeclaration): boolean {
        if (ast.heritageClauses) {
            for (const heritageClause of ast.heritageClauses) {
                for (const type of heritageClause.types) {
                    const typeName = type.expression.getText();
                    if (typeName !== "Page") {
                        return false;
                    }

                    if (this._imports.get(typeName)?.isCRNPage ?? false) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    static getImportNames(node: ts.ImportDeclaration): string[] {
        const importNames: string[] = [];

        if (node.importClause) {
            if (node.importClause.name && node.importClause.name.getText()) {
                importNames.push(node.importClause.name.getText());
            }

            if (node.importClause.namedBindings) {
                if (ts.isNamedImports(node.importClause.namedBindings)) {
                    node.importClause.namedBindings.elements.forEach((element) => {
                        importNames.push(element.name.getText());
                    });
                }
            }
        }

        return importNames;
    }

    static getImports(f: File): Map<string, Import> {
        const result = new Map<string, Import>();

        f.ast.forEachChild((node) => {
            if (ts.isImportDeclaration(node)) {
                const importNames = File.getImportNames(node);
                importNames.forEach((name) => {
                    result.set(name, new Import(name, node, f));
                });
            }
        });

        return result;
    }

    static getCRNPage(f: File): Map<string, CRNPage> {
        const result = new Map<string, CRNPage>();

        f.ast.forEachChild((node) => {
            if (ts.isClassDeclaration(node)) {
                if (f.IsCRNPage(node)) {
                    result.set(node.name?.text ?? "", new CRNPage(node, f));
                }
            }
        });

        return result;
    }
}

export default File;