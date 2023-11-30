export class TSEnumMember {
    private _filePath: string = "";
    private _name: string = "";
    private _hash: string = "";
    private _dependentHash: string = "";
    private _enum: string = "";
    private _member: string = "";
    private _value_type: string = "";
    private _value: string = "";

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

    get enum(): string {
        return this._enum;
    }

    set enum(value: string) {
        this._enum = value;
    }

    get member(): string {
        return this._member;
    }

    set member(value: string) {
        this._member = value;
    }

    get value_type(): string {
        return this._value_type;
    }

    set value_type(value: string) {
        this._value_type = value;
    }

    get value(): string {
        return this._value;
    }

    set value(value: string) {
        this._value = value;
    }

    toJSON() {
        return {
            filePath: this.filePath,
            name: this.name,
            hash: this.hash,
            enum: this.enum,
            member: this.member,
            valueType: this.value_type,
            value: this.value,
        };
    }
}