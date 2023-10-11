import * as path from "path";
import ts, {NamespaceExportDeclaration} from "typescript";
import fs from "fs";
import Directory from "./directory";
import Import from "./import";
import CRNPage from "./crnpage";
import Package from "./package";
import {visitAllChildren} from "./utils";
import Class from "./class";
import Variable from "./variable";
import Namespace from "./namespace";
import Interface from "./interface";
import TypeAlias from "./typealias";
import PackageDirectory from "./packagedirectory";
import Module from "./module";

export class File {
    private readonly _name: string;
    private readonly _location: string;
    private readonly _ast: ts.SourceFile;
    private readonly _imports: Map<string, Import> = new Map<string, Import>();
    private readonly _crnPage: Map<string, CRNPage> = new Map<string, CRNPage>();
    private readonly _path: string;
    private readonly _parent: Directory | Package | PackageDirectory;
    private readonly _classes: Map<string, Class> = new Map<string, Class>();
    private readonly _variables: Map<string, Variable> = new Map<string, Variable>();
    private readonly _namespaces: Map<string, Namespace> = new Map<string, Namespace>();
    private readonly _modules: Map<string, Module> = new Map<string, Module>();
    private readonly _interfaces: Map<string, Interface> = new Map<string, Interface>();
    private readonly _typeAliases: Map<string, TypeAlias> = new Map<string, TypeAlias>();

    constructor(location: string, parent: Directory | Package | PackageDirectory) {
        this._location = location;
        this._name = path.basename(location);
        this._parent = parent;
        this._path = path.join(parent.path, path.basename(location, path.extname(location)))
        this._parent.files.set(this.path, this)

        const scriptKindElement = ts.ScriptKind[path.extname(this._name).toUpperCase().replace("\.", "") as keyof typeof ts.ScriptKind];
        this._ast = ts.createSourceFile(location, fs.readFileSync(location, 'utf-8'), ts.ScriptTarget.ES2015, true, scriptKindElement);
        this._crnPage = File.getCRNPage(this);

        visitAllChildren(this._ast, (node) => {
            if (ts.isClassDeclaration(node)) {
                new Class(node, this);
                return true;
            }

            if (ts.isVariableDeclaration(node)) {
                if (ts.isIdentifier(node.name) && ts.isVariableStatement(node.parent.parent)) {
                    new Variable(node, this)
                    return true;
                }
            }

            if (ts.isModuleDeclaration(node)) {
                if (ts.isIdentifier(node.name)) {
                    new Namespace(node, this);
                } else {
                    new Module(node, this);
                }

                return false;
            }

            if (ts.isInterfaceDeclaration(node)) {
                new Interface(node, this)
                return true;
            }

            if (ts.isTypeAliasDeclaration(node)) {
                new TypeAlias(node, this)
                return true;
            }

            return true;
        });
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

    public get parent(): Directory | Package | PackageDirectory {
        return this._parent;
    }

    public get imports(): Map<string, Import> {
        return this._imports;
    }

    public get crnPage(): Map<string, CRNPage> {
        return this._crnPage;
    }

    public get classes(): Map<string, Class> {
        return this._classes;
    }

    public get variables(): Map<string, Variable> {
        return this._variables;
    }

    public get namespaces(): Map<string, Namespace> {
        return this._namespaces;
    }

    public get interfaces(): Map<string, Interface> {
        return this._interfaces;
    }

    public get typeAliases(): Map<string, TypeAlias> {
        return this._typeAliases;
    }

    public get modules(): Map<string, Module> {
        return this._modules;
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
                } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                    importNames.push(node.importClause.namedBindings.name.getText());
                }
            }
        }

        return importNames;
    }

    public BuildImports() {
        this.ast.forEachChild((node) => {
            if (ts.isImportDeclaration(node)) {
                const importNames = File.getImportNames(node);
                importNames.forEach((name) => {
                    if (!Import.IsIgnore(name, node)) {
                        new Import(name, node, this);
                    }
                });
            }
        });

        this.modules.forEach((m) => {
            m.BuildImports();
        });
    }

    public BuildDependencies() {
        this._classes.forEach((cls) => {
            cls.BuildDependencies();
        });

        this._variables.forEach((v) => {
            v.BuildDependencies();
        });

        this._interfaces.forEach((i) => {
            i.BuildDependencies();
        });

        this._typeAliases.forEach((ta) => {
            ta.BuildDependencies();
        });

        this._namespaces.forEach((ns) => {
            ns.BuildDependencies();
        });

        this._modules.forEach((m) => {
            m.BuildDependencies();
        });

        this.removeInvalidItems();
    }

    private removeInvalidItems() {
        const rc: string[] = [];
        this._classes.forEach((v, k) => {
            if (!v.dependencyIsValid) {
                rc.push(k);
            }
        });

        rc.forEach((k) => {
            this._classes.delete(k);
            this.parent.classes.delete(k);
        });

        const rv: string[] = [];
        this._variables.forEach((v, k) => {
            if (!v.dependencyIsValid) {
                rv.push(k);
            }
        });

        rv.forEach((k) => {
            this._variables.delete(k);
            this.parent.variables.delete(k);
        });

        const ri: string[] = [];
        this._interfaces.forEach((v, k) => {
            if (!v.dependencyIsValid) {
                ri.push(k);
            }
        });

        ri.forEach((k) => {
            this._interfaces.delete(k);
            this.parent.interfaces.delete(k);
        });

        const rta: string[] = [];
        this._typeAliases.forEach((v, k) => {
            if (!v.dependencyIsValid) {
                rta.push(k);
            }
        });

        rta.forEach((k) => {
            this._typeAliases.delete(k);
            this.parent.typeAliases.delete(k);
        });
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