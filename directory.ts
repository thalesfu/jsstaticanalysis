import Repository from "./repository";
import * as path from "path";
import * as fs from "fs";

export class Directory {
    private readonly _path: string;
    private readonly _location: string;
    private readonly _repository: Repository;
    private readonly _canImport: boolean = false;

    static readonly IMPORTABLE = ["index.ts", "index.tsx", "index.js", "index.jsx"];


    constructor(location: string, repository: Repository) {
        this._location = location;
        this._repository = repository;
        this._path = path.relative(repository.getLocation(), location)

        this._canImport = fs.readdirSync(location).filter((file) => Directory.IMPORTABLE.includes(file)).length > 0;
    }

    public get path(): string {
        return this._path;
    }

    public get location(): string {
        return this._location;
    }

    public get repository(): Repository {
        return this._repository;
    }

    public get canImport(): boolean {
        return this._canImport;
    }
}

export default Directory;