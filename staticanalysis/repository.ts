import * as fs from "fs";
import * as path from "path";
import Package from "./package";
import Directory from "./directory";
import File from "./file"
import CRNPage from "./crnpage";
import Class from "./class";
import Interface from "./interface";
import Variable from "./variable";
import TypeAlias from "./typealias";
import TagType from "./TagType";
import PackageDirectory from "./packagedirectory";
import Module from "./module";
import Namespace from "./namespace";
import {rootCertificates} from "tls";
import {ObjectBind} from "./objectbind";

export class Repository {
    private readonly _rootlocation: string;
    private readonly _location: string

    private readonly _tsconfig: any
    private readonly _packages: Map<string, Package> = new Map<string, Package>();
    private readonly _directories: Map<string, Directory> = new Map<string, Directory>();
    private readonly _files: Map<string, File> = new Map<string, File>();
    private readonly _classes: Map<string, Class> = new Map<string, Class>();
    private readonly _variables: Map<string, Variable> = new Map<string, Variable>();
    private readonly _namespace: Map<string, Namespace> = new Map<string, Namespace>();
    private readonly _modules: Map<string, Module> = new Map<string, Module>();
    private readonly _interfaces: Map<string, Interface> = new Map<string, Interface>();
    private readonly _typeAliases: Map<string, TypeAlias> = new Map<string, TypeAlias>();
    private readonly _objectBinds: Map<string, ObjectBind> = new Map<string, ObjectBind>();
    private readonly _crnPages: Map<string, CRNPage> = new Map<string, CRNPage>();


    constructor(location: string) {
        if (!fs.existsSync(location)) {
            throw new Error(`Path ${location} does not exist.`);
        }

        this._rootlocation = location;

        this._tsconfig = JSON.parse(fs.readFileSync(path.join(location, "tsconfig.json"), 'utf-8'));

        const stats = fs.statSync(location);
        if (!stats.isDirectory()) {
            throw new Error(`Path ${location} is not a directory.`);
        }

        const moduleDir = path.join(location, "node_modules");
        if (fs.existsSync(moduleDir)) {
            this._packages = Repository.getPackages(moduleDir, this);
            this.buildPackagesDependencies();
            this.buildPackageDirectories();
            this.buildPackageFiles();
            this.buildPackageFilesImports();
            this.buildPackageItemsDependencies();
        }

        this._location = this._tsconfig.compilerOptions?.paths?.["~/*"];
        if (!this._location) {
            this._location = location
        } else {
            this._location = path.join(location, this._location[0].replace("/*", ""))
        }
        Repository.buildDirectories(this._location, this);
        this.directories.forEach(dir => {
            dir.BuildFiles();
        });
        this.directories.forEach(dir => {
            dir.BuildFileImports();
        });
        this.directories.forEach(dir => {
            dir.BuildItemsDependencies();
        });

        this.buildPackageTags();
    }

    public get location(): string {
        return this._location;
    }

    public get packages(): Map<string, Package> {
        return this._packages;
    }

    public get directories(): Map<string, Directory> {
        return this._directories;
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

    public get crnPages(): Map<string, CRNPage> {
        return this._crnPages;
    }

    static getPackages(p: string, r: Repository): Map<string, Package> {
        const result = new Map<string, Package>();
        if (fs.existsSync(p)) {
            fs.readdirSync(p).forEach(i => {
                const sp = path.join(p, i);
                const packageJsonPath = path.join(sp, 'package.json');

                if (fs.statSync(sp).isDirectory()) {
                    if (fs.existsSync(packageJsonPath)) {
                        if (!Package.isInBlackList(packageJsonPath)) {
                            const pkg = new Package(sp, r);
                            result.set(pkg.name, pkg);
                        }
                    } else {
                        Repository.getPackages(sp, r).forEach((v, k) => {
                            result.set(k, v);
                        });
                    }
                }
            });
        }

        return result;
    }


    static buildDirectories(p: string, r: Repository) {
        if (fs.statSync(p).isDirectory()) {
            if (Repository.hasSupportedFile(p)) {
                new Directory(p, r);
            }

            fs.readdirSync(p).forEach(i => {
                Repository.buildDirectories(path.join(p, i), r)
            });
        }
    }

    private buildPackageItemsDependencies() {
        this.packages.forEach((pkg) => {
            pkg.BuildItemsDependencies();
        });
    }

    private buildPackageDirectories() {
        this.packages.forEach((pkg) => {
            pkg.BuildDirectories();
        });
    }

    private buildPackageFiles() {
        this.packages.forEach((pkg) => {
            pkg.BuildFiles();
        });
    }

    private buildPackageFilesImports() {
        this.packages.forEach((pkg) => {
            pkg.BuildFileImports();
        });
    }

    private buildPackagesDependencies() {
        this.packages.forEach((pkg) => {
            pkg.BuildDependencies();
        });
    }

    public GetTopologicalSortDependentPackages(): Package[] {
        let result: Package[] = [];
        let inDegree: Map<Package, number> = new Map<Package, number>();

        for (const pkg of this.packages.values()) {
            inDegree.set(pkg, pkg.dependencies.size);
        }

        let next: Package[] = [];
        for (const pkg of this.packages.values()) {
            if (inDegree.get(pkg) === 0) {
                next.push(pkg);
                inDegree.delete(pkg);
            }
        }

        while (next.length > 0) {
            const node = next.pop()!;
            result.push(node);

            for (let [resultNode, count] of inDegree.entries()) {
                for (let neighbor of resultNode.dependencies.values()) {
                    if (neighbor === node) {
                        inDegree.set(resultNode, count - 1);
                        if (inDegree.get(resultNode) === 0) {
                            next.push(resultNode);
                            inDegree.delete(resultNode);
                        }
                    }
                }
            }
        }

        if (result.length !== this.packages.size) {
            return [];
        }

        return result;
    }

    public GetTopologicalSortTypePackages(): Package[] {
        const typePackages: Package[] = [];
        this.packages.forEach((pkg) => {
            if (pkg.IsType) {
                typePackages.push(pkg);
            }
        });


        let result: Package[] = [];
        let inDegree: Map<Package, number> = new Map<Package, number>();

        for (const pkg of typePackages) {
            inDegree.set(pkg, pkg.typeDependencies.size);
        }

        let next: Package[] = [];
        for (const pkg of typePackages) {
            if (inDegree.get(pkg) === 0) {
                next.push(pkg);
                inDegree.delete(pkg);
            }
        }

        while (next.length > 0) {
            const node = next.pop()!;
            result.push(node);

            for (let [resultNode, count] of inDegree.entries()) {
                for (let neighbor of resultNode.typeDependencies.values()) {
                    if (neighbor === node) {
                        inDegree.set(resultNode, count - 1);
                        if (inDegree.get(resultNode) === 0) {
                            next.push(resultNode);
                            inDegree.delete(resultNode);
                        }
                    }
                }
            }
        }

        if (result.length !== typePackages.length) {
            return [];
        }

        return result;
    }

    private buildPackageTags() {
        const component = this.packages.get("@types/react")?.classes.get("Component");
        Repository.buildTag(component!, TagType.Component);
        const pureComponent = this.packages.get("@types/react")?.classes.get("PureComponent");
        Repository.buildTag(pureComponent!, TagType.Component);
        const page = this.packages.get("@ctrip/crn")?.classes.get("Page");
        Repository.buildTag(page!, TagType.Page);
    }

    private static hasSupportedFile(p: string): boolean {
        if (Repository.isInBlackList(p)) {
            return false;
        }

        return fs.readdirSync(p).filter((file) => Directory.SUPPORTTEDEXTENSIONS.includes(path.extname(file))).length > 0;
    }

    private static isInBlackList(pkgPath: string): boolean {
        if (Repository.isInWhiteList(pkgPath)) {
            return false
        }

        const parts = new Set(pkgPath.split(path.sep));

        if (parts.has(".__tmp")) {
            return true;
        }

        if (parts.has(".git")) {
            return true;
        }

        if (parts.has(".husky")) {
            return true;
        }

        if (parts.has(".idea")) {
            return true;
        }

        if (parts.has("__mocks__")) {
            return true;
        }

        if (parts.has("__test__")) {
            return true;
        }

        if (parts.has("dist")) {
            return true;
        }

        if (parts.has("docs")) {
            return true;
        }

        if (parts.has("fonts")) {
            return true;
        }

        if (parts.has("node_modules")) {
            return true;
        }

        return false;
    }

    private static isInWhiteList(pkgPath: string): boolean {
        return false
    }

    static buildTag(item: Class | Interface | Variable | TypeAlias | ObjectBind, tag: TagType) {
        item.tags.add(tag);
        item.beDependedOn.forEach((dep) => {
            Repository.buildTag(dep, tag);
        });
    }
}

export default Repository;