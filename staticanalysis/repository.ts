import * as fs from "fs";
import * as path from "path";
import Package from "./package";
import Directory from "./directory";
import File from "./file"
import CRNPage from "./crnpage";

export class Repository {
    private readonly _location: string;

    private readonly _packages: Map<string, Package> = new Map<string, Package>();
    private readonly _directories: Map<string, Directory> = new Map<string, Directory>();
    private readonly _files: Map<string, File> = new Map<string, File>();
    private readonly _crnPages: Map<string, CRNPage> = new Map<string, CRNPage>();


    constructor(location: string) {
        if (!fs.existsSync(location)) {
            throw new Error(`Path ${location} does not exist.`);
        }

        this._location = location;

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

        const srcDir = path.join(location, "src");
        if (fs.existsSync(srcDir)) {
            this._directories = Repository.getDirectories(srcDir, this);
        }

        this.directories.forEach(dir => {
            dir.files.forEach(file => {
                this._files.set(file.path, file);
            });

            dir.crnPages.forEach(page => {
                this._crnPages.set(page.name, page);
            });
        });
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


    static getDirectories(p: string, r: Repository): Map<string, Directory> {
        const result = new Map<string, Directory>();

        fs.readdirSync(p).forEach(i => {
            const sp = path.join(p, i);
            if (fs.statSync(sp).isDirectory()) {
                result.set(sp, new Directory(sp, r));

                Repository.getDirectories(sp, r).forEach((v, k) => {
                    result.set(k, v);
                });
            }
        });

        return result;
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
}

export default Repository;