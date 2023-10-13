import ts from "typescript";
import File from "./file";
import Namespace from "./namespace";
import Module from "./module";
import Variable from "./variable";
import TypeAlias from "./typealias";
import Class from "./class";
import TagType from "./TagType";
import ObjectBind from "./objectbind";

export class Interface {
    private readonly _name: string;
    private readonly _ast: ts.InterfaceDeclaration;
    private readonly _file: File;
    private readonly _namespace: Namespace | undefined;
    private readonly _module: Module | undefined;
    private readonly _isExport: boolean = false;
    private readonly _extends: Map<string, Interface | undefined> = new Map<string, Interface | undefined>();
    private readonly _dependencies: (Class | Interface | Variable | TypeAlias | ObjectBind)[] = [];
    private readonly _beDependedOn: (Class | Interface | Variable | TypeAlias | ObjectBind)[] = [];
    private readonly _tags: Set<TagType> = new Set<TagType>();

    constructor(ast: ts.InterfaceDeclaration, from: File | Namespace | Module) {
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
        this._name = ast.name?.text ?? "";
        this._isExport = ast.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;

        ast.heritageClauses?.forEach(heritageClause => {
            heritageClause.types.forEach(type => {
                if (heritageClause.token === ts.SyntaxKind.ExtendsKeyword) {
                    this._extends.set(type.expression.getText(), undefined);
                }
            });
        });

        if (from instanceof Namespace) {
            this._namespace?.interfaces.set(this._name, this);
            const nsItrName = this._namespace?.name + "." + this._name;
            this._file.interfaces.set(nsItrName, this);
            this._file.directory.interfaces.set(nsItrName, this);
            const pkgNsItrName = this._file.directory.path.length > 0 ? this._file.directory.path + "." + nsItrName : nsItrName;
            this._file.root.interfaces.set(pkgNsItrName, this);
        } else if (from instanceof Module) {
            this._module?.interfaces.set(this._name, this);
            this._module?.package?.interfaces.set(this._name, this);
        }
        this._file.interfaces.set(this._name, this);
        this._file.directory.interfaces.set(this._name, this);
        const pkgItrName = this._file.directory.path.length > 0 ? this._file.directory.path + "." + this._name : this._name;
        this._file.root.interfaces.set(pkgItrName, this);
    }

    public get name(): string {
        return this._name;
    }

    public get ast(): ts.InterfaceDeclaration {
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

    public get extends(): Map<string, Interface | undefined> {
        return this._extends;
    }

    public get isExport(): boolean {
        return this._isExport;
    }

    public get dependencies(): (Class | Interface | Variable | TypeAlias | ObjectBind)[] {
        return this._dependencies;
    }

    public get beDependedOn(): (Class | Interface | Variable | TypeAlias | ObjectBind)[] {
        return this._beDependedOn;
    }

    public get tags(): Set<TagType> {
        return this._tags;
    }

    public get dependencyIsValid(): boolean {
        if (this._extends.size === 0) {
            return true;
        }

        for (let v of this._extends.values()) {
            if (!v) {
                return false;
            }
        }

        return true
    }

    public BuildDependencies() {
        this._extends.forEach((value, key) => {
            if (!value) {
                const e = this.getExtend(key);
                if (e) {
                    this._extends.set(key, e);
                    this._dependencies.push(e);
                    e.beDependedOn.push(this);
                }
            }
        });
    }

    private getExtend(key: string): Interface | undefined {
        const i = this._file?.interfaces.get(key);
        if (i) {
            return i;
        }

        return this.getImport(key);
    }

    private getImport(key: string) {
        if (!key.includes(".")) {
            const ip = this._file?.imports.get(key);
            if (ip) {
                if (ip.imported instanceof Interface) {
                    return ip.imported;
                }
            }
        } else {
            const parts = key.split(".");
            const i = this._file?.imports.get(parts[0]);
            if (i?.imported instanceof Namespace) {
                return i.imported.interfaces.get(parts[1]);
            }
        }
    }
}

export default Interface;