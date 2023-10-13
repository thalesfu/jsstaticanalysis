import ts from "typescript";
import File from "./file";
import Class from "./class";
import Namespace from "./namespace";
import Interface from "./interface";
import TypeAlias from "./typealias";
import Module from "./module";
import TagType from "./TagType";
import Variable from "./variable";
import lo from "lodash";
import {isAbsoluteImport, isRelateImport} from "./utils";
import Import from "./import";

export class ObjectBind {
    private readonly _name: string;
    private readonly _ast: ts.ObjectBindingPattern;
    private readonly _file: File;
    private readonly _namespace: Namespace | undefined;
    private readonly _module: Module | undefined;
    private readonly _isExport: boolean = false;
    private readonly _objectName: string = "";
    private _base: Class | undefined;
    private readonly _dependencies: (Class | Interface | Variable | TypeAlias | ObjectBind)[] = [];
    private readonly _beDependedOn: (Class | Interface | Variable | TypeAlias | ObjectBind)[] = [];
    private readonly _tags: Set<TagType> = new Set<TagType>();

    constructor(name: string, ast: ts.ObjectBindingPattern, from: File | Namespace | Module) {
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
        this._name = name
        if (ts.isVariableStatement(ast.parent.parent.parent)) {
            this._isExport = ast.parent.parent.parent.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
        }

        if (ts.isVariableDeclaration(ast.parent)) {
            const i = ast.parent.initializer
            if (i && ts.isIdentifier(i)) {
                this._objectName = i.getText();
            } else {
                console.log("ObjectBind: " + this._name + " has no object name");
            }
        }

        if (from instanceof Namespace) {
            this._namespace?.objectBinds.set(this._name, this);
            const nsOBName = this._namespace?.name + "." + this._name;
            this._file.objectBinds.set(nsOBName, this);
            this._file.directory.objectBinds.set(nsOBName, this);
            const pkgNsVarName = this._file.directory.path.length > 0 ? this._file.directory.path + "." + nsOBName : nsOBName;
            this._file.root.objectBinds.set(pkgNsVarName, this);
        } else if (from instanceof Module) {
            this._module?.objectBinds.set(this._name, this);
            this._module?.package?.objectBinds.set(this._name, this);
        }

        this._file.objectBinds.set(this._name, this);
        this._file.directory.objectBinds.set(this._name, this);
        const pkgOBName = this._file.directory.path.length > 0 ? this._file.directory.path + "." + this._name : this._name;
        this._file.root.objectBinds.set(pkgOBName, this);
    }

    public get name(): string {
        return this._name;
    }

    public get ast(): ts.ObjectBindingPattern {
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

    public get base(): Class | undefined {
        return this._base;
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
        return this._base !== undefined;
    }

    public BuildDependencies() {
        if (this._objectName == "") {
            return undefined;
        }

        const v = this.getObjectVariable(this._objectName);

        if (!v) {
            return undefined;
        }

        this._base = this.getDependentClass(v, this._name)
    }

    private getDependentClass(v: Variable, p: string): Class | undefined {
        if (!v.ast.initializer || !ts.isObjectLiteralExpression(v.ast.initializer)) {
            return undefined;
        }

        const returnStatement = this.getReturnStatement(v.ast.initializer, p);

        if (!returnStatement) {
            return undefined;
        }

        if (returnStatement.expression
            && ts.isPropertyAccessExpression(returnStatement.expression)
            && ts.isCallExpression(returnStatement.expression.expression)
            && returnStatement.expression.expression.expression.getText() === "require") {
            let fromString = returnStatement.expression.expression.arguments[0].getText().replace(/["']/g, "");
            const importedString = returnStatement.expression.name.getText();
            let message = ""


            let from = Import.GetFrom(fromString, v.file);
            let imported: Class | Variable | Namespace | Interface | TypeAlias | undefined;
            if (!from) {
                message += `Cannot find from path ${fromString}; `;
            } else {
                imported = Import.GetImported(importedString, from);
            }

            if (!imported) {
                message += `Cannot find imported ${importedString} in from path ${fromString}; `;

                if (!isRelateImport(fromString) && !isAbsoluteImport(fromString)) {
                    fromString = "@types/" + fromString;
                    from = Import.GetFrom(fromString, this.file);

                    if (!from) {
                        message += `Cannot find from path ${fromString}; `;
                    } else {
                        imported = Import.GetImported(importedString, from);

                        if (!imported) {
                            message += `Cannot find class ${importedString} in package ${fromString}; `;
                        }
                    }
                }
            }

            if (imported && imported instanceof Class) {
                return imported;
            }
        }

        return undefined;

    }

    private getReturnStatement(ast: ts.ObjectLiteralExpression, p: string): ts.ReturnStatement | undefined {

        let result: ts.ReturnStatement | undefined = undefined;

        ast.forEachChild((child) => {
            if (ts.isGetAccessor(child)) {
                if (ts.isIdentifier(child.name)) {
                    if (child.name.getText() === p) {
                        child.body?.statements.forEach((statement) => {
                            if (ts.isReturnStatement(statement)) {
                                result = statement;
                            }
                        });
                    }
                }
            }
        });

        return result;
    }

    private getObjectVariable(obj: string): Variable | undefined {
        const v = this._file.variables.get(obj);
        if (v) {
            if (v.ast.initializer && ts.isObjectLiteralExpression(v.ast.initializer)) {
                return v;
            }
        }

        const ip = this._file.imports.get(obj)?.imported;

        if (ip) {
            if (ip instanceof Variable) {
                if (ip.ast.initializer && ts.isObjectLiteralExpression(ip.ast.initializer)) {
                    return ip;
                }
            }
        }

        return undefined;
    }
}

export default ObjectBind;