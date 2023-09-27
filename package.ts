import path from "path";
import * as fs from "fs";

export class Package {
    private readonly _name: string;
    private readonly _version: string;
    private readonly _location: string;

    constructor(location: string) {
        const packageJsonPath = path.join(location, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error(`Path ${packageJsonPath} does not exist.`);
        }

        this._location = location;
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        this._name = pkg.name;
        this._version = pkg.version
    }

    public get name(): string {
        return this._name;
    }

    public get version(): string {
        return this._version;
    }

    public get location(): string {
        return this._location;
    }
}

export default Package;