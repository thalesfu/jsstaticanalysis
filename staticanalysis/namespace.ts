import ts from "typescript";
import File from "./file";
import Class from "./class";
import Variable from "./variable";
import Interface from "./interface";
import TypeAlias from "./typealias";
import {visitAllChildren} from "./utils";
import {ObjectBind} from "./objectbind";

export class Namespace {
    private readonly _name: string;
    private readonly _ast: ts.ModuleDeclaration;
    private readonly _file: File;
    private readonly _classes: Map<string, Class> = new Map<string, Class>();
    private readonly _variables: Map<string, Variable> = new Map<string, Variable>();
    private readonly _interfaces: Map<string, Interface> = new Map<string, Interface>();
    private readonly _typeAliases: Map<string, TypeAlias> = new Map<string, TypeAlias>();
    private readonly _objectBinds: Map<string, ObjectBind> = new Map<string, ObjectBind>();

    constructor(ast: ts.ModuleDeclaration,  from: File) {
        this._ast = ast;
        this._file = from;
        this._name = ast.name.getText();

        this._file.namespaces.set(this._name, this);
        this._file.directory.namespace.set(this._name, this);

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
}

export default Namespace;