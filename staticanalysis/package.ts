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
        this.BuildFiles();
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

    public BuildFiles() {
        fs.readdirSync(this.location)
            .filter(file => {
                if (fs.statSync(path.join(this.location, file)).isDirectory()) {
                    return false;
                }
                return Package.SUPPORTTEDEXTENSIONS.includes(path.extname(file));
            })
            .forEach((file) => {
                const f = new File(path.join(this.location, file), this);
                this._files.set(f.path, f);
            });

        this._directories.forEach((dir) => {
            dir.BuildFiles()
        });
    }

    public BuildDependencies() {
        // if (this._pkg.dependencies) {
        //     Object.keys(this._pkg.dependencies).forEach(dep => {
        //         if (this._repo.packages.has(dep)) {
        //             const dependentPackage = this._repo.packages.get(dep)!;
        //             if (dep.startsWith("@types/")) {
        //                 this._typeDependencies.set(dep, dependentPackage);
        //
        //                 if (this.name.startsWith("@types/")) {
        //                     dependentPackage.beTypeDependents.set(this.name, this);
        //                 }
        //             }
        //
        //             this._dependencies.set(dep, dependentPackage);
        //             dependentPackage.beDependents.set(this.name, this);
        //         }
        //     });
        // }
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
        const directories = Package.getDirectories(this.location, this);

        directories.forEach((dir, path) => {
            this._directories.set(path, dir);
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

    static getDirectories(p: string, pkg: Package): Map<string, PackageDirectory> {
        const result = new Map<string, PackageDirectory>();

        fs.readdirSync(p).forEach(i => {
            const sp = path.join(p, i);
            if (fs.statSync(sp).isDirectory()) {
                if (Package.hasSupportedFile(sp)) {
                    result.set(sp, new PackageDirectory(sp, pkg));
                }

                Package.getDirectories(sp, pkg).forEach((v, k) => {
                    result.set(k, v);
                });
            }
        });

        return result;
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
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

        if (pkg.name.startsWith("@types/react")) {
            return true;
        }

        if (pkg.name.startsWith("@ctrip/crn")) {
            return true;
        }

        if (pkg.name.startsWith("@types/hoist-non-react-statics")) {
            return true;
        }

        return false
    }
}

export default Package;