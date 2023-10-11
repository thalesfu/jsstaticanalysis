import ts from "typescript";
import File from "./file";
import file from "./file";
import {type} from "os";
import Namespace from "./namespace";
import Interface from "./interface";
import Module from "./module";
import Variable from "./variable";
import variable from "./variable";
import TypeAlias from "./typealias";

export class Class {
    private readonly _name: string;
    private readonly _ast: ts.ClassDeclaration;
    private readonly _isExport: boolean = false;
    private readonly _extends: Map<string, Class | Variable | undefined> = new Map<string, Class | variable | undefined>();
    private readonly _implements: Map<string, Interface | undefined> = new Map<string, Interface | undefined>();
    private readonly _file: File;
    private readonly _namespace: Namespace | undefined;
    private readonly _module: Module | undefined;
    private readonly _dependencies: (Class | Interface | Variable | TypeAlias)[] = [];
    private readonly _beDependedOn: (Class | Interface | Variable | TypeAlias)[] = [];

    constructor(ast: ts.ClassDeclaration, from: File | Namespace | Module) {
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
                } else if (heritageClause.token === ts.SyntaxKind.ImplementsKeyword) {
                    this._implements.set(type.expression.getText(), undefined);
                }
            });
        });

        if (from instanceof Namespace) {
            this._namespace?.classes.set(this._name, this);
            const clsName = this._namespace?.name + "." + this._name;
            this._file.classes.set(clsName, this);
            this._file.parent.classes.set(clsName, this);
        } else if (from instanceof Module) {
            this._module?.classes.set(this._name, this);
            this._module?.package?.classes.set(this._name, this);
        }
        this._file.classes.set(this._name, this);
        this._file.parent.classes.set(this._name, this);
    }

    public get name(): string {
        return this._name;
    }

    public get ast(): ts.ClassDeclaration {
        return this._ast;
    }

    public get file(): undefined | File {
        return this._file;
    }

    public get extends(): Map<string, Class | Variable | undefined> {
        return this._extends;
    }

    public get implements(): Map<string, Interface | undefined> {
        return this._implements;
    }

    public get isExport(): boolean {
        return this._isExport;
    }

    public get namespace(): Namespace | undefined {
        return this._namespace;
    }

    public get module(): Module | undefined {
        return this._module;
    }

    public get dependencyIsValid(): boolean {
        return this._extends.size === 0 && this._implements.size === 0;
    }

    public get dependencies(): (Class | Interface | Variable | TypeAlias)[] {
        return this._dependencies;
    }

    public get beDependedOn(): (Class | Interface | Variable | TypeAlias)[] {
        return this._beDependedOn;
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

        this._implements.forEach((value, key) => {
            if (!value) {
                const i = this.getImplements(key);
                if (i) {
                    this._implements.set(key, i);
                    this._dependencies.push(i);
                    i.beDependedOn.push(this);
                }
            }
        });
    }

    private getExtend(key: string): Class | Variable | undefined {
        const c = this._file?.classes.get(key);
        if (c) {
            return c;
        }

        const v = this._file?.variables.get(key);
        if (v) {
            return v;
        }

        return this.getImportClass(key);
    }

    private getImplements(key: string): Interface | undefined {
        const i = this._file?.interfaces.get(key);
        if (i) {
            return i;
        }

        return this.getImportInterface(key);
    }

    private getImportClass(key: string) {
        if (!key.includes(".")) {
            const ip = this._file?.imports.get(key);
            if (ip) {
                if (ip.imported instanceof Class) {
                    return ip.imported;
                }
            }
        } else {
            const parts = key.split(".");
            const i = this._file?.imports.get(parts[0]);
            if (i?.imported instanceof Namespace) {
                return i.imported.classes.get(parts[1]);
            }
        }
    }

    private getImportInterface(key: string) {
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

export default Class;