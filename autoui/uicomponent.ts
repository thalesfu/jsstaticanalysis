export class UIComponent {
    private readonly _name: string;
    private _parent: string = "";
    private _description: string = "";
    private _source: string = "";
    private _children: UIComponent[] = [];

    constructor(name: string) {
        this._name = name;
    }

    public get name(): string {
        return this._name;
    }

    public get parent(): string {
        return this._parent;
    }

    public set parent(parent: string) {
        this._parent = parent;
    }

    public get description(): string {
        return this._description;
    }

    public set description(description: string) {
        this._description = description;
    }

    public get source(): string {
        return this._source;
    }

    public set source(source: string) {
        this._source = source;
    }

    public get children(): UIComponent[] {
        return this._children;
    }

    toJSON() {
        return {
            name: this._name,
            parent: this._parent,
            description: this._description,
            source: this._source,
            children: this._children
        };
    }
}

export default UIComponent;