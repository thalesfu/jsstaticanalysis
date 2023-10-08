import path from "path";
import * as fs from "fs";
import Repository from "./repository";

export class Package {
    private readonly _location: string;
    private readonly _pkg: any;
    private readonly _dependencies: Map<string, Package> = new Map<string, Package>();
    private readonly _typeDependencies: Map<string, Package> = new Map<string, Package>();
    private readonly _beDependents: Map<string, Package> = new Map<string, Package>();
    private readonly _beTypeDependents: Map<string, Package> = new Map<string, Package>();
    private readonly _repo: Repository;

    constructor(location: string, repo: Repository) {
        this._repo = repo;
        const packageJsonPath = path.join(location, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error(`Path ${packageJsonPath} does not exist.`);
        }

        this._location = location;
        this._pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    }

    public get name(): string {
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

    public buildDependencies() {
        if (this._pkg.dependencies) {
            Object.keys(this._pkg.dependencies).forEach(dep => {
                if (this._repo.dependencies.has(dep)) {
                    const dependentPackage = this._repo.dependencies.get(dep)!;
                    if (dep.startsWith("@types/")) {
                        this._typeDependencies.set(dep, dependentPackage);

                        if (this.name.startsWith("@types/")) {
                            dependentPackage.beTypeDependents.set(this.name, this);
                        }
                    }

                    this._dependencies.set(dep, dependentPackage);
                    dependentPackage.beDependents.set(this.name, this);
                }
            });
        }
    }
}

export default Package;