import ts from "typescript";
import File from "./file";
import Class from "./class";
import Namespace from "./namespace";
import Interface from "./interface";
import TypeAlias from "./typealias";
import Module from "./module";
import TagType from "./TagType";

export class Variable {
    private readonly _name: string;
    private readonly _ast: ts.VariableDeclaration;
    private readonly _file: File;
    private readonly _namespace: Namespace | undefined;
    private readonly _module: Module | undefined;
    private readonly _isExport: boolean = false;
    private readonly _base: Map<string, Class | Interface | TypeAlias | Variable | undefined> = new Map<string, Class | Interface | TypeAlias | Variable | undefined>();
    private readonly _dependencies: (Class | Interface | Variable | TypeAlias)[] = [];
    private readonly _beDependedOn: (Class | Interface | Variable | TypeAlias)[] = [];
    private readonly _tags: Set<TagType> = new Set<TagType>();

    constructor(ast: ts.VariableDeclaration, from: File | Namespace | Module) {
        if (from instanceof Namespace) {
            this._namespace = from;
            this._file = from.file;
        } else if (from instanceof Module) {
            this._module = from;
            this._file = from.file;
        } else {
            this._file = from;
        }
        this._ast = ast;
        this._name = ast.name.getText();
        if (ts.isVariableStatement(ast.parent.parent)) {
            this._isExport = ast.parent.parent.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
        }

        const t = ast.type;
        if (t && ts.isTypeReferenceNode(t)) {
            this._base.set(t.typeName.getText(), undefined);
        }

        if (t && ts.isIntersectionTypeNode(t)) {
            for (const tx of t.types) {
                if (ts.isTypeQueryNode(tx)) {
                    this._base.set(tx.exprName.getText(), undefined);
                }
            }
        }

        if (from instanceof Namespace) {
            this._namespace?.variables.set(this._name, this);
            const nsVarName = this._namespace?.name + "." + this._name;
            this._file.variables.set(nsVarName, this);
            this._file.directory.variables.set(nsVarName, this);
            const pkgNsVarName = this._file.directory.path.length > 0 ? this._file.directory.path + "." + nsVarName : nsVarName;
            this._file.root.variables.set(pkgNsVarName, this);
        } else if (from instanceof Module) {
            this._module?.variables.set(this._name, this);
            this._module?.package?.variables.set(this._name, this);
        }

        this._file.variables.set(this._name, this);
        this._file.directory.variables.set(this._name, this);
        const pkgVarName = this._file.directory.path.length > 0 ? this._file.directory.path + "." + this._name : this._name;
        this._file.root.variables.set(pkgVarName, this);
    }

    public get name(): string {
        return this._name;
    }

    public get ast(): ts.VariableDeclaration {
        return this._ast;
    }

    public get file(): File {
        return this._file;
    }

    public get namespace(): Namespace | undefined {
        return this._namespace;
    }

    public get module(): Module | undefined {
        return this._module;
    }

    public get base(): Map<string, Class | Interface | TypeAlias | Variable | undefined> {
        return this._base;
    }

    public get isExport(): boolean {
        return this._isExport;
    }

    public get dependencies(): (Class | Interface | Variable | TypeAlias)[] {
        return this._dependencies;
    }

    public get beDependedOn(): (Class | Interface | Variable | TypeAlias)[] {
        return this._beDependedOn;
    }

    public get tags(): Set<TagType> {
        return this._tags;
    }

    public get dependencyIsValid(): boolean {
        if (this._base.size === 0) {
            return true;
        }

        for (let v of this._base.values()) {
            if (!v) {
                return false;
            }
        }

        return true
    }

    public BuildDependencies() {
        this.base.forEach((value, key) => {
            if (!value) {
                const b = this.getImport(key);
                if (b) {
                    this._base.set(key, b);
                    b.beDependedOn.push(this);
                    this._dependencies.push(b);
                }
            }
        });
    }

    private getBase(key:string):Class | Interface | Variable | TypeAlias | undefined{
        const c = this._file?.classes.get(key);
        if (c) {
            return c;
        }

        const i = this._file?.interfaces.get(key);
        if (i) {
            return i;
        }

        const v = this._file?.variables.get(key);
        if (v) {
            return v;
        }

        return  this.getImport(key);
    }

    private getImport(key: string) {
        if (!key.includes(".")) {
            const ip = this._file?.imports.get(key);
            if (ip) {
                if (!(ip.imported instanceof Namespace)) {
                    return ip.imported;
                }
            }
        } else {
            const parts = key.split(".");
            const i = this._file?.imports.get(parts[0]);
            if (i?.imported instanceof Namespace) {
                return i.imported.classes.get(parts[1]) ?? i.imported.interfaces.get(parts[1]) ?? i.imported.variables.get(parts[1]) ?? i.imported.typeAliases.get(parts[1]);
            }
        }
    }
}

export default Variable;