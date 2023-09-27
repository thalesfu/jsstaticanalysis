import * as fs from "fs";
import * as path from "path";
import Package from "./package";
import Directory from "./directory";

export class Repository {
    private readonly _location: string;

    private readonly dependencies: Map<string, Package> = new Map<string, Package>();
    private readonly directories: Map<string, Directory> = new Map<string, Directory>();


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
            this.dependencies = getDependencies(moduleDir);
        }

        const srcDir = path.join(location, "src");
        if (fs.existsSync(srcDir)) {
            this.directories = getDirectories(srcDir, this);
        }
    }

    public getLocation(): string {
        return this._location;
    }

    public getDependencies(): Map<string, Package> {
        return this.dependencies;
    }

    public getDirectories(): Map<string, Directory> {
        return this.directories;
    }
}

function getDependencies(p: string): Map<string, Package> {
    const result = new Map<string, Package>();
    if (fs.existsSync(p)) {
        fs.readdirSync(p).forEach(i => {
            const sp = path.join(p, i);
            const packageJsonPath = path.join(sp, 'package.json');

            if (fs.statSync(sp).isDirectory()) {
                if (fs.existsSync(packageJsonPath)) {
                    const pkg = new Package(sp);
                    result.set(pkg.name, pkg);
                } else {
                    getDependencies(sp).forEach((v, k) => {
                        result.set(k, v);
                    });
                }
            }
        });
    }

    return result;
}

function getDirectories(p: string, r: Repository): Map<string, Directory> {
    const result = new Map<string, Directory>();

    fs.readdirSync(p).forEach(i => {
        const sp = path.join(p, i);
        if (fs.statSync(sp).isDirectory()) {
            result.set(sp, new Directory(sp, r));

            getDirectories(sp, r).forEach((v, k) => {
                result.set(k, v);
            });
        }
    });

    return result;
}

export default Repository;