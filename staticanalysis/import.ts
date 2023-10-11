import ts from "typescript";
import File from "./file"
import Class from "./class";
import Package from "./package";
import Variable from "./variable";
import Namespace from "./namespace";
import Interface from "./interface";
import TypeAlias from "./typealias";
import {isRelateImport} from "./utils";
import path from "path";

export class Import {
    private readonly _name: string;
    private readonly _ast: ts.ImportDeclaration;
    private readonly _file: File ;
    private readonly _imported: Class | Variable | Namespace | Interface | TypeAlias | undefined;
    private readonly _from: Package | File | undefined;

    constructor(name: string, ast: ts.ImportDeclaration, file: File) {
        this._name = name;
        this._ast = ast;
        this._file = file;

        let fromString = this._ast.moduleSpecifier.getText().replace(/["']/g, "");
        let message = "";
        let from = this.getFrom(fromString);
        let imported: Class | Variable | Namespace | Interface | TypeAlias | undefined;
        if (!from) {
            message += `Cannot find from path ${fromString}; `;
        } else {
            imported = this.getImported(this._name, from);
        }

        if (!imported) {
            message += `Cannot find imported ${this._name} in from path ${fromString}; `;

            if (!isRelateImport(fromString)) {
                fromString = "@types/" + fromString;
                from = this.getFrom(fromString);

                if (!from) {
                    message += `Cannot find from path ${fromString}; `;
                } else {
                    imported = this.getImported(this._name, from);

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

    public get from(): Package | File | undefined {
        return this._from;
    }

    public get imported(): Class | Variable | Namespace | Interface | TypeAlias | undefined {
        return this._imported;
    }

    public get isCRNPage(): boolean {
        return this._from?.name === "@ctrip/crn" && this._name === "Page";
    }

    private getFrom(from: string): Package | File | undefined {
        if (isRelateImport(from)) {
            const ext = path.extname(from);
            const s = path.join(this._file.parent.path, path.basename(from, ext));

            return this._file.parent.files.get(s);
        }

        return this._file.parent.repo.packages.get(from);
    }

    private getImported(name: string, from: Package | File): Class | Variable | Namespace | Interface | TypeAlias | undefined {
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