export class TSCodeImport {
    private _filePath: string = "";
    private _name: string = "";
    private _importFrom: string = "";
    private _hash: string = "";
    private _dependentHash: string = "";


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

    get importFrom(): string {
        return this._importFrom;
    }

    set importFrom(value: string) {
        this._importFrom = value;
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

    toJSON() {
        return {
            filePath: this.filePath,
            name: this.name,
            importFrom: this.importFrom,
            hash: this.hash,
        };
    }
}