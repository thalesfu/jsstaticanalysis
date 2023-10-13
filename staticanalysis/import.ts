import ts from "typescript";
import File from "./file"
import Class from "./class";
import Package from "./package";
import Variable from "./variable";
import Namespace from "./namespace";
import Interface from "./interface";
import TypeAlias from "./typealias";
import {isAbsoluteImport, isRelateImport} from "./utils";
import path from "path";
import Directory from "./directory";
import PackageDirectory from "./packagedirectory";

export class Import {
    private readonly _name: string;
    private readonly _ast: ts.ImportDeclaration;
    private readonly _file: File;
    private readonly _imported: Class | Variable | Namespace | Interface | TypeAlias | undefined;
    private readonly _from: Package | File | Directory | PackageDirectory | undefined;

    constructor(name: string, ast: ts.ImportDeclaration, file: File) {
        this._name = name;
        this._ast = ast;
        this._file = file;

        let fromString = this._ast.moduleSpecifier.getText().replace(/["']/g, "");
        let message = "";
        let from = Import.GetFrom(fromString, this.file);
        let imported: Class | Variable | Namespace | Interface | TypeAlias | undefined;
        if (!from) {
            message += `Cannot find from path ${fromString}; `;
        } else {
            imported = Import.GetImported(this._name, from);
        }

        if (!imported) {
            message += `Cannot find imported ${this._name} in from path ${fromString}; `;

            if (!isRelateImport(fromString) && !isAbsoluteImport(fromString)) {
                fromString = "@types/" + fromString;
                from = Import.GetFrom(fromString, this.file);

                if (!from) {
                    message += `Cannot find from path ${fromString}; `;
                } else {
                    imported = Import.GetImported(this._name, from);

                    if (!imported) {
                        message += `Cannot find class ${this._name} in package ${fromString}; `;
                    }
                }
            }
        }


        if (!from || !imported) {
            return;
        }

        this._from = from;
        this._imported = imported;
        this.file.imports.set(this._name, this);
    }

    public get name(): string {
        return this._name;
    }

    public get ast(): ts.ImportDeclaration {
        return this._ast;
    }

    public get file(): File {
        return this._file;
    }

    public get from(): Package | File | Directory | PackageDirectory | undefined {
        return this._from;
    }

    public get imported(): Class | Variable | Namespace | Interface | TypeAlias | undefined {
        return this._imported;
    }

    public static GetFrom(from: string, file: File): Package | File | Directory | PackageDirectory | undefined {
        if (isRelateImport(from)) {
            const ext = path.extname(from);
            const s = path.join(file.directory.path, from.replace(ext, ""));

            const f = file.root.files.get(s);

            if (f) {
                return f;
            }

            return file.root.directories.get(s);
        }

        if (isAbsoluteImport(from)) {
            const ext = path.extname(from);
            const s = from.replace(ext, "").replace("~/", "");

            const f = file.root.files.get(s);

            if (f) {
                return f;
            }

            return file.root.directories.get(s);
        }

        return file.directory.repo.packages.get(from);
    }

    public static GetImported(name: string, from: Package | File | Directory | PackageDirectory): Class | Variable | Namespace | Interface | TypeAlias | undefined {
        const cls = from.classes.get(name);
        if (cls) {
            return cls;
        }

        const v = from.variables.get(name);
        if (v) {
            return v;
        }

        const i = from.interfaces.get(name);
        if (i) {
            return i;
        }

        const ta = from.typeAliases.get(name);
        if (ta) {
            return ta;
        }

        if (from instanceof Package) {
            const ns = from.namespace.get(name);
            if (ns) {
                return ns;
            }
        }

        return undefined;
    }

    static IsIgnore(name: string, node: ts.ImportDeclaration) {
        let pkgName = node.moduleSpecifier.getText().replace(/["']/g, "");

        if (pkgName === "gensync") {
            return true;
        }

        return false;
    }
}

export default Import;