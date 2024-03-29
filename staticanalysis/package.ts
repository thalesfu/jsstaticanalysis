import path from "path";
import * as fs from "fs";
import Repository from "./repository";
import File from "./file";
import {Class} from "./class";
import {Variable} from "./variable";
import {Namespace} from "./namespace";
import Interface from "./interface";
import TypeAlias from "./typealias";
import Directory from "./directory";
import PackageDirectory from "./packagedirectory";
import Module from "./module";
import {ObjectBind} from "./objectbind";
import ts from "typescript";

export class Package {
    private readonly _location: string;
    private readonly _pkg: any;
    private readonly _dependencies: Map<string, Package> = new Map<string, Package>();
    private readonly _typeDependencies: Map<string, Package> = new Map<string, Package>();
    private readonly _beDependents: Map<string, Package> = new Map<string, Package>();
    private readonly _beTypeDependents: Map<string, Package> = new Map<string, Package>();
    private readonly _directories: Map<string, PackageDirectory> = new Map<string, PackageDirectory>();
    private readonly _files: Map<string, File> = new Map<string, File>();
    private readonly _classes: Map<string, Class> = new Map<string, Class>();
    private readonly _objectBinds: Map<string, ObjectBind> = new Map<string, ObjectBind>();
    private readonly _variables: Map<string, Variable> = new Map<string, Variable>();
    private readonly _namespace: Map<string, Namespace> = new Map<string, Namespace>();
    private readonly _modules: Map<string, Module> = new Map<string, Module>();
    private readonly _interfaces: Map<string, Interface> = new Map<string, Interface>();
    private readonly _typeAliases: Map<string, TypeAlias> = new Map<string, TypeAlias>();
    private readonly _repo: Repository;
    static readonly SUPPORTTEDEXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

    constructor(location: string, repo: Repository) {
        this._repo = repo;
        const packageJsonPath = path.join(location, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error(`Path ${packageJsonPath} does not exist.`);
        }

        this._location = location;
        this._pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    }

    public get scriptTarget(): ts.ScriptTarget {
        return this._repo.scriptTarget;
    }

    public get name(): string {
        return this._pkg.name;
    }

    public get path(): string {
        return this._pkg.name;
    }

    public get version(): string {
        return this._pkg.version;
    }

    public get location(): string {
        return this._location;
    }

    public get dependencies(): Map<string, Package> {
        return this._dependencies;
    }

    public get typeDependencies(): Map<string, Package> {
        return this._typeDependencies;
    }

    public get beDependents(): Map<string, Package> {
        return this._beDependents;
    }

    public get beTypeDependents(): Map<string, Package> {
        return this._beTypeDependents;
    }

    public get repo(): Repository {
        return this._repo;
    }

    public get pkg(): any {
        return this._pkg;
    }

    public get IsType(): boolean {
        return this._pkg.name.startsWith("@types/");
    }

    public get files(): Map<string, File> {
        return this._files;
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

    public get directories(): Map<string, PackageDirectory> {
        return this._directories;
    }

    public BuildFiles() {
        this._directories.forEach((dir) => {
            dir.BuildFiles()
        });
    }

    public BuildDependencies() {
        Package.processDependencies(this, this._pkg.dependencies);
        Package.processDependencies(this, this._pkg.peerDependencies);
        Package.processDependencies(this, this._pkg.devDependencies);
    }


    static processDependencies(pkg: Package, dependencies: Object) {
        if (dependencies) {
            Object.keys(dependencies).forEach(dep => {
                if (pkg.repo.packages.has(dep)) {
                    const dependentPackage = pkg.repo.packages.get(dep)!;
                    if (dep.startsWith("@types/")) {
                        pkg.typeDependencies.set(dep, dependentPackage);

                        if (pkg.name.startsWith("@types/")) {
                            dependentPackage.beTypeDependents.set(pkg.name, pkg);
                        }
                    }

                    pkg.dependencies.set(dep, dependentPackage);
                    dependentPackage.beDependents.set(pkg.name, pkg);
                }
            });
        }
    }

    public BuildDirectories() {
        Package.doBuildDirectories(this.location, this);
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

    static doBuildDirectories(p: string, pkg: Package) {
        if (fs.statSync(p).isDirectory()) {
            if (Package.hasSupportedFile(p)) {
                new PackageDirectory(p, pkg)
            }

            fs.readdirSync(p).forEach(i => {
                Package.doBuildDirectories(path.join(p, i), pkg)
            });
        }
    }

    private static hasSupportedFile(p: string): boolean {
        if (PackageDirectory.isInBlackList(p)) {
            return false;
        }

        return fs.readdirSync(p).filter((file) => PackageDirectory.SUPPORTTEDEXTENSIONS.includes(path.extname(file))).length > 0;
    }

    public static isInBlackList(pkgPath: string): boolean {
        if (Package.isInWhiteList(pkgPath)) {
            return false
        }

        return true
    }

    public static isInWhiteList(pkgPath: string): boolean {
        let pkg: any;

        const content = fs.readFileSync(pkgPath, 'utf-8');

        if (content.length=== 0) {
            return false;
        }

        pkg = JSON.parse(content);

        if (pkg.name=== undefined) {
            return false;
        }

        if (pkg.name.startsWith("@types/react")) {
            return true;
        }

        if (pkg.name.startsWith("@ctrip/crn")) {
            return true;
        }

        if (pkg.name.startsWith("@ctrip/tripkit")) {
            return true;
        }

        if (pkg.name.startsWith("@types/hoist-non-react-statics")) {
            return true;
        }

        return false
    }
}

export default Package;