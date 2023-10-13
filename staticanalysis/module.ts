import ts from "typescript";
import File from "./file";
import Class from "./class";
import Variable from "./variable";
import Interface from "./interface";
import TypeAlias from "./typealias";
import {visitAllChildren} from "./utils";
import Package from "./package";
import Import from "./import";
import {ObjectBind} from "./objectbind";

export class Module {
    private readonly _name: string;
    private readonly _ast: ts.ModuleDeclaration;
    private readonly _file: File;
    private readonly _classes: Map<string, Class> = new Map<string, Class>();
    private readonly _package: Package | undefined;
    private readonly _imports: Map<string, Import> = new Map<string, Import>();
    private readonly _variables: Map<string, Variable> = new Map<string, Variable>();
    private readonly _interfaces: Map<string, Interface> = new Map<string, Interface>();
    private readonly _typeAliases: Map<string, TypeAlias> = new Map<string, TypeAlias>();
    private readonly _objectBinds: Map<string, ObjectBind> = new Map<string, ObjectBind>();

    constructor(ast: ts.ModuleDeclaration, from: File) {
        this._ast = ast;
        this._file = from;
        this._name = ast.name.getText().replace(/'/g, "");

        this._file.modules.set(this._name, this);
        this._file.directory.modules.set(this._name, this);
        const pkg = this._file.directory.repo.packages.get(this._name);

        if (!pkg) {
            return;
        }

        this._package = pkg;

        visitAllChildren(this._ast, (node) => {
            if (ts.isClassDeclaration(node)) {
                new Class(node, this);
                return true;
            }

            if (ts.isVariableDeclaration(node)) {
                if (ts.isIdentifier(node.name) && ts.isVariableStatement(node.parent.parent)) {
                    new Variable(node, this);
                    return true;
                }
            }

            if (ts.isInterfaceDeclaration(node)) {
                new Interface(node, this);
                return true;
            }

            if (ts.isTypeAliasDeclaration(node)) {
                new TypeAlias(node, this);
                return true;
            }

            return true;
        });
    }

    public get name(): string {
        return this._name;
    }

    public get ast(): ts.ModuleDeclaration {
        return this._ast;
    }

    public get file(): File {
        return this._file;
    }

    public get classes(): Map<string, Class> {
        return this._classes;
    }

    public get variables(): Map<string, Variable> {
        return this._variables;
    }

    public get interfaces(): Map<string, Interface> {
        return this._interfaces;
    }

    public get typeAliases(): Map<string, TypeAlias> {
        return this._typeAliases;
    }

    public get objectBinds(): Map<string, ObjectBind> {
        return this._objectBinds;
    }

    public get package(): Package | undefined {
        return this._package;
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
    }

    public BuildImports() {
        this.ast.body?.forEachChild((node) => {
            if (ts.isImportDeclaration(node)) {
                const importNames = File.getImportNames(node);
                importNames.forEach((name) => {
                    if (!Import.IsIgnore(name, node)) {
                        new Import(name, node, this.file);
                    }
                });
            }
        });
    }
}

export default Module;