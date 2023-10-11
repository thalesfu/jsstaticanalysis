import ts from "typescript";
import Class from "./class";
import {findJSX} from "./utils";
import Variable from "./variable";

export class JSX {
    private readonly _ast: ts.JsxElement | ts.JsxSelfClosingElement | undefined;
    private readonly _item: Class | Variable;
    private readonly _children: JSX[];
    private readonly _attributes: Map<string, string>;
    private readonly _tagName: string;

    constructor(item: Class | Variable) {
        this._item = item;
        this._ast = findJSX(item);
        this._tagName = this.getTagName(this._ast) ?? item.name;
        this._attributes = this.getAttributes(this._ast);
        this._children = this.getChildren(this._ast);
    }

    private getTagName(ast: ts.JsxElement | ts.JsxSelfClosingElement | undefined) {
        if (!ast) {
            return undefined;
        }

        if (ts.isJsxElement(ast)) {
            return ast.openingElement.tagName.getText();
        }

        return ast.tagName.getText();
    }


    get ast(): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
        return this._ast;
    }

    get item(): Class | Variable {
        return this._item;
    }

    get children(): JSX[] {
        return this._children;
    }

    get attributes(): Map<string, string> {
        return this._attributes;
    }

    get tagName(): string {
        return this._tagName;
    }

    private getAttributes(_ast: ts.JsxElement | ts.JsxSelfClosingElement | undefined): Map<string, string> {
        const result: Map<string, string> = new Map<string, string>();

        if (!_ast) {
            return result;
        }

        if (ts.isJsxElement(_ast)) {
            _ast.openingElement.attributes.properties.forEach(attr => {
                if (ts.isJsxAttribute(attr)) {
                    result.set(attr.name.getText(), attr.initializer?.getText() ?? "");
                }
            });

            return result;
        }

        _ast.attributes.properties.forEach(attr => {
            if (ts.isJsxAttribute(attr)) {
                result.set(attr.name.getText(), attr.initializer?.getText() ?? "");
            }
        });

        return result;
    }

    private getChildren(_ast: ts.JsxElement | ts.JsxSelfClosingElement | undefined): JSX[] {
        const result: JSX[] = [];

        if (!_ast) {
            return result;
        }

        if (ts.isJsxSelfClosingElement(_ast)) {
            return result;
        }

        _ast.children.forEach(child => {
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
                const tagName = this.getTagName(child);
                if (tagName) {
                    const cls = this.findClass(tagName);
                    if (cls) {
                        result.push(new JSX(cls));
                    } else {
                        console.log("Not found tag " + tagName + " in file " + this._item.file?.location);
                    }
                } else {
                    console.log("Tag name is empty in file " + this._item.file?.location);
                }
                return;
            }

            if (ts.isJsxText(child)) {
                if (child.text.trim().length == 0) {
                    return;
                }
            }

            console.log("\"" + child.getText() + "\" is not supported. Its type is " + ts.SyntaxKind[child.kind]);
        });

        return result;
    }

    private findClass(name: string): Class | Variable | undefined {
        const i = this._item.file?.imports.get(name)?.imported

        if (i) {
            if (i instanceof Class || i instanceof Variable) {
                return i;
            } else {
                console.log("Tag " + name + " is not a class in file " + this._item.file?.location);
            }
        }

        return undefined;
    }
}