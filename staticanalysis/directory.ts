import Repository from "./repository";
import File from "./file";
import * as path from "path";
import * as fs from "fs";
import CRNPage from "./crnpage";

export class Directory {
    static readonly IMPORTABLE = ["index.ts", "index.tsx", "index.js", "index.jsx"];
    static readonly SUPPORTTEDEXTENSIONS = [".tsx"];

    private readonly _path: string;
    private readonly _location: string;
    private readonly _repository: Repository;
    private readonly _canImport: boolean = false;
    private readonly _files: Map<string, File> = new Map<string, File>();
    private readonly _crnPages: Map<string, CRNPage> = new Map<string, CRNPage>();


    constructor(location: string, repository: Repository) {
        this._location = location;
        this._repository = repository;
        this._path = path.relative(repository.location, location)
        this._canImport = fs.readdirSync(location).filter((file) => Directory.IMPORTABLE.includes(file)).length > 0;

        fs.readdirSync(location)
            .filter(file => {
                if (fs.statSync(path.join(location, file)).isDirectory()) {
                    return false;
                }
                return Directory.SUPPORTTEDEXTENSIONS.includes(path.extname(file));
            })
            .forEach((file) => {
                const f = new File(path.join(location, file), this);
                this._files.set(f.path, f);
            });

        this.files.forEach(file => {
            file.crnPage.forEach(page => {
                this._crnPages.set(page.name, page);
            });
        });
    }

    public get path()
        :
        string {
        return this._path;
    }

    public get location()
        :
        string {
        return this._location;
    }

    public get repository()
        :
        Repository {
        return this._repository;
    }


    public get canImport()
        :
        boolean {
        return this._canImport;
    }

    public get files(): Map<string, File> {
        return this._files;
    }

    public get crnPages(): Map<string, CRNPage> {
        return this._crnPages;
    }
}

export default Directory;