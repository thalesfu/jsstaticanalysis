import Repository from "./repository";
import File from "./file";
import * as path from "path";
import * as fs from "fs";
import CRNPage from "./crnpage";
import {Class} from "./class";
import {Variable} from "./variable";
import {Namespace} from "./namespace";
import Interface from "./interface";
import TypeAlias from "./typealias";
import Module from "./module";
import {ObjectBind} from "./objectbind";

export class Directory {
    static readonly IMPORTABLE = ["index.ts", "index.tsx", "index.js", "index.jsx"];
    static readonly SUPPORTTEDEXTENSIONS = [".tsx", ".ts"];

    private readonly _path: string;
    private readonly _location: string;
    private readonly _repo: Repository;
    private readonly _canImport: boolean = false;
    private readonly _files: Map<string, File> = new Map<string, File>();
    private readonly _crnPages: Map<string, CRNPage> = new Map<string, CRNPage>();
    private readonly _classes: Map<string, Class> = new Map<string, Class>();
    private readonly _variables: Map<string, Variable> = new Map<string, Variable>();
    private readonly _namespace: Map<string, Namespace> = new Map<string, Namespace>();
    private readonly _modules: Map<string, Module> = new Map<string, Module>();
    private readonly _interfaces: Map<string, Interface> = new Map<string, Interface>();
    private readonly _typeAliases: Map<string, TypeAlias> = new Map<string, TypeAlias>();
    private readonly _objectBinds: Map<string, ObjectBind> = new Map<string, ObjectBind>();


    constructor(location: string, repository: Repository) {
        this._location = location;
        this._repo = repository;
        this._path = path.relative(repository.location, location)
        this._canImport = fs.readdirSync(location).filter((file) => Directory.IMPORTABLE.includes(file)).length > 0;
        this._repo.directories.set(this.path, this);
    }

    public get path(): string {
        return this._path;
    }

    public get location(): string {
        return this._location;
    }

    public get repo(): Repository {
        return this._repo;
    }


    public get canImport(): boolean {
        return this._canImport;
    }

    public get files(): Map<string, File> {
        return this._files;
    }

    public get crnPages(): Map<string, CRNPage> {
        return this._crnPages;
    }

    public get classes(): Map<string, Class> {
        return this._classes;
    }

    public get variables(): Map<string, Variable> {
        return this._variables;
    }

    public get namespace(): Map<string, Namespace> {
        return this._namespace;
    }

    public get modules(): Map<string, Module> {
        return this._modules;
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

    public BuildFiles() {
        const fg = fs.readdirSync(this.location)
            .filter(file => {
                if (fs.statSync(path.join(this.location, file)).isDirectory()) {
                    return false;
                }
                return Directory.SUPPORTTEDEXTENSIONS.includes(path.extname(file));
            })
            .reduce((grouped: Map<string, Map<string, string>>, file) => {
                const ext = path.extname(file);
                const bf = file.split('.')[0]

                if (!grouped.has(bf)) {
                    grouped.set(bf, new Map<string, string>());
                }

                grouped.get(bf)?.set(ext, file);

                return grouped;
            }, new Map<string, Map<string, string>>);

        fg.forEach((g) => {
            for (let ext of Directory.SUPPORTTEDEXTENSIONS) {
                if (g.has(ext)) {
                    new File(path.join(this.location, g.get(ext)!), this);
                    return;
                }
            }
        });
    }

    public BuildFileImports() {
        this._files.forEach((file) => {
            file.BuildImports();
        });
    }


    public BuildItemsDependencies() {
        this._files.forEach((file) => {
            file.BuildDependencies();
        });
    }
}

export default Directory;