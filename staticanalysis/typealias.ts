import ts from "typescript";
import File from "./file";
import Interface from "./interface";
import Namespace from "./namespace";
import Module from "./module";
import Variable from "./variable";
import Class from "./class";
import TagType from "./TagType";

export class TypeAlias {
    private readonly _name: string;
    private readonly _ast: ts.TypeAliasDeclaration;
    private readonly _file: File;
    private readonly _namespace: Namespace | undefined;
    private readonly _module: Module | undefined;
    private readonly _isExport: boolean = false;
    private readonly _base: Map<string, Interface | undefined> = new Map<string, Interface | undefined>();
    private readonly _dependencies: (Class | Interface | Variable | TypeAlias)[] = [];
    private readonly _beDependedOn: (Class | Interface | Variable | TypeAlias)[] = [];
    private readonly _tags: Set<TagType> = new Set<TagType>();

    constructor(ast: ts.TypeAliasDeclaration, from: File | Namespace | Module) {
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
        this._isExport = ast.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;

        const t = ast.type;
        if (t && ts.isTypeReferenceNode(t)) {
            this._base.set(t.typeName.getText(), undefined);
        }

        if (from instanceof Namespace) {
            this._namespace?.typeAliases.set(this._name, this);
            const nsTAName = this._namespace?.name + "." + this._name;
            this._file.typeAliases.set(nsTAName, this);
            this._file.directory.typeAliases.set(nsTAName, this);
            const pkgNsTAName = this._file.directory.path.length > 0 ? this._file.directory.path + "." + nsTAName : nsTAName;
            this._file.root.typeAliases.set(pkgNsTAName, this);
        } else if (from instanceof Module) {
            this._module?.typeAliases.set(this._name, this);
            this._module?.package?.typeAliases.set(this._name, this);
        }
        this._file.typeAliases.set(this._name, this);
        this._file.directory.typeAliases.set(this._name, this);
        const pkgTAName = this._file.directory.path.length > 0 ? this._file.directory.path + "." + this._name : this._name;
        this._file.root.typeAliases.set(pkgTAName, this);
    }

    public get name(): string {
        return this._name;
    }

    public get ast(): ts.TypeAliasDeclaration {
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

    public get isExport(): boolean {
        return this._isExport;
    }

    public get base(): Map<string, Interface | undefined> {
        return this._base;
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
        this._base.forEach((value, key) => {
            if (!value) {
                const b = this.getBase(key);
                if (b) {
                    this._base.set(key, b);
                    b.beDependedOn.push(this);
                    this._dependencies.push(b);
                }
            }
        });
    }

    private  getBase(key:string):Interface | undefined{
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

export default TypeAlias;