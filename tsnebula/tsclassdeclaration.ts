export class TSClassDeclaration {
    private _filePath: string = "";
    private _name: string = "";
    private _hash: string = "";
    private _dependentHash: string = "";
    private _isExported: boolean = false;
    private _isDefaultExport: boolean = false;
    private _isAbstract: boolean = false;
    private _heritage: string = "";


    get filePath(): string {
        return this._filePath;
    }

    set filePath(value: string) {
        this._filePath = value;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get hash(): string {
        return this._hash;
    }

    set hash(value: string) {
        this._hash = value;
    }

    get dependentHash(): string {
        return this._dependentHash;
    }

    set dependentHash(value: string) {
        this._dependentHash = value;
    }


    get isExported(): boolean {
        return this._isExported;
    }

    set isExported(value: boolean) {
        this._isExported = value;
    }

    get isDefaultExport(): boolean {
        return this._isDefaultExport;
    }

    set isDefaultExport(value: boolean) {
        this._isDefaultExport = value;
    }

    get isAbstract(): boolean {
        return this._isAbstract;
    }

    set isAbstract(value: boolean) {
        this._isAbstract = value;
    }

    get heritage(): string {
        return this._heritage;
    }

    set heritage(value: string) {
        this._heritage = value;
    }

    toJSON() {
        return {
            filePath: this.filePath,
            name: this.name,
            hash: this.hash,
            isexport: this.isExported,
            isdefaultexport: this.isDefaultExport,
            isabsolute: this.isAbstract,
            heritage: this.heritage,
        };
    }
}