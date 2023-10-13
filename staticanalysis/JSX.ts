import ts from "typescript";
import Class from "./class";
import {extractJSX, findJSX, findRenderJSX} from "./utils";
import Variable from "./variable";
import ObjectBind from "./objectbind";

export class JSX {
    private readonly _ast: ts.JsxElement | ts.JsxSelfClosingElement | undefined;
    private readonly _item: Class | Variable
    private readonly _children: JSX[];
    private readonly _attributes: Map<string, string>;
    private readonly _tagName: string;
    private readonly _parent: JSX | undefined;
    private readonly _parentUsedAst: ts.JsxElement | ts.JsxSelfClosingElement | undefined;

    constructor(item: Class | Variable, parent: JSX | undefined = undefined, parentUsedAst: ts.JsxElement | ts.JsxSelfClosingElement | undefined = undefined) {
        this._item = item;
        this._parent = parent;
        this._parentUsedAst = parentUsedAst;
        this._ast = findRenderJSX(item);
        this._tagName = JSX.getTagName(this._ast) ?? item.name;
        const attributes = JSX.getAttributes(this._ast, this);
        const parentAttributes = JSX.getAttributes(this._parentUsedAst, this._parent!);
        parentAttributes.forEach((value, key) => {
            attributes.set(key, value);
        });
        this._attributes = attributes;
        this._children = JSX.getChildren(this);
    }

    private static getTagName(ast: ts.JsxElement | ts.JsxSelfClosingElement | undefined) {
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

    get item(): Class | Variable | ObjectBind {
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

    private static getAttributes(_ast: ts.JsxElement | ts.JsxSelfClosingElement | undefined, jsx: JSX): Map<string, string> {
        const result: Map<string, string> = new Map<string, string>();

        if (!_ast) {
            return result;
        }

        if (ts.isJsxElement(_ast)) {
            _ast.openingElement.attributes.properties.forEach(attr => {
                JSX.processAttribute(attr, result, jsx);
            });

            return result;
        }

        _ast.attributes.properties.forEach(attr => {
            JSX.processAttribute(attr, result, jsx);
        });

        return result;
    }

    private static processAttribute(attr: ts.JsxAttribute | ts.JsxSpreadAttribute, result: Map<string, string | undefined>, jsx: JSX) {
        if (ts.isJsxAttribute(attr)) {
            const k = attr.name.getText();
            let v = undefined;

            if (attr.initializer) {
                if (ts.isJsxExpression(attr.initializer)) {
                    if (attr.initializer.expression) {
                        if (ts.isIdentifier(attr.initializer.expression)
                            || ts.isArrayLiteralExpression(attr.initializer.expression)
                            || ts.isObjectLiteralExpression(attr.initializer.expression)
                            || ts.isStringLiteral(attr.initializer.expression)
                            || attr.initializer.expression.kind == ts.SyntaxKind.FirstLiteralToken
                            || attr.initializer.expression.kind == ts.SyntaxKind.TrueKeyword
                            || attr.initializer.expression.kind == ts.SyntaxKind.FalseKeyword) {
                            v = attr.initializer.expression.getText();
                            if (!JSX.getJsxElement(v, jsx)) {
                                result.set(k, attr.initializer.getText());
                            }
                        } else if (ts.isPropertyAccessExpression(attr.initializer.expression)) {
                            v = attr.initializer.expression.getText();
                            if (!JSX.getJsxElement(v, jsx)) {
                                result.set(k, attr.initializer.getText());
                            }
                        } else {
                            console.log("Cannot get attribute key: \"" + k + "\" value: \"" + attr.initializer?.getText() + "\". Attr initializer is JSXExpression. Attr initializer.expression is " + ts.SyntaxKind[attr.initializer.expression.kind] + " in file " + jsx.item.file?.location);
                        }
                    }
                } else if (ts.isStringLiteral(attr.initializer)) {
                    v = attr.initializer.text;
                    if (!JSX.getJsxElement(v, jsx)) {
                        result.set(k, v);
                    }
                } else {
                    console.log("Cannot get attribute key: \"" + k + "\" value: \"" + attr.initializer?.getText() + "\". Attr initializer is " + ts.SyntaxKind[attr.initializer.kind] + " in file " + jsx.item.file?.location);
                }
            } else {
                result.set(k, undefined);
            }
        }
    }

    private static getJsxAttributes(_ast: ts.JsxElement | ts.JsxSelfClosingElement | undefined, jsx: JSX): Map<string, ts.JsxElement | ts.JsxSelfClosingElement> {
        const result: Map<string, ts.JsxElement | ts.JsxSelfClosingElement> = new Map<string, ts.JsxElement | ts.JsxSelfClosingElement>();

        if (!_ast) {
            return result;
        }

        if (ts.isJsxElement(_ast)) {
            _ast.openingElement.attributes.properties.forEach(attr => {
                JSX.processJsxAttribute(attr, jsx, result);
            });

            return result;
        }

        _ast.attributes.properties.forEach(attr => {
            JSX.processJsxAttribute(attr, jsx, result);
        });

        return result;
    }

    private static processJsxAttribute(attr: ts.JsxAttribute | ts.JsxSpreadAttribute, jsx: JSX, result: Map<string, ts.JsxElement | ts.JsxSelfClosingElement>) {
        if (ts.isJsxAttribute(attr)) {
            const k = attr.name.getText();
            let v = undefined;

            if (attr.initializer) {
                if (ts.isJsxExpression(attr.initializer)) {
                    if (attr.initializer.expression) {
                        if (ts.isIdentifier(attr.initializer.expression)
                            || ts.isArrayLiteralExpression(attr.initializer.expression)
                            || ts.isObjectLiteralExpression(attr.initializer.expression)
                            || ts.isStringLiteral(attr.initializer.expression)) {
                            v = attr.initializer.expression.getText();
                            const j = JSX.getJsxElement(v, jsx)
                            if (j) {
                                result.set(k, j);
                            }
                        } else if (ts.isPropertyAccessExpression(attr.initializer.expression)) {
                            v = attr.initializer.expression.getText();
                            const j = JSX.getJsxElement(v, jsx)
                            if (j) {
                                result.set(k, j);
                            }
                        } else if (attr.initializer.expression.kind == ts.SyntaxKind.FirstLiteralToken
                            || attr.initializer.expression.kind == ts.SyntaxKind.TrueKeyword
                            || attr.initializer.expression.kind == ts.SyntaxKind.FalseKeyword) {

                        } else {
                            console.log("Cannot get attribute key: \"" + k + "\" value: \"" + attr.initializer?.getText() + "\". Attr initializer is JSXExpression. Attr initializer.expression is " + ts.SyntaxKind[attr.initializer.expression.kind] + " in file " + jsx.item.file?.location);
                        }
                    }
                } else if (ts.isStringLiteral(attr.initializer)) {
                    v = attr.initializer.text;
                    const j = JSX.getJsxElement(v, jsx)
                    if (j) {
                        result.set(k, j);
                    }
                } else {
                    console.log("Cannot get attribute key: \"" + k + "\" value: \"" + attr.initializer?.getText() + "\". Attr initializer is " + ts.SyntaxKind[attr.initializer.kind] + " in file " + jsx.item.file?.location);
                }
            }
        }
    }

    private static getJsxElement(value: string, jsx: JSX): ts.JsxElement | ts.JsxSelfClosingElement | undefined {
        if (value.match(/\w+\.\w+/)) {
            const vs = value.split(".");

            const item = this.getJSXAttributeValueItem(vs[0], jsx);

            if (!(item instanceof Class || item instanceof Variable)) {
                return undefined;
            }

            return findJSX(item, vs[1]);

        }

        const item = this.getJSXAttributeValueItem(value, jsx);

        if (!(item instanceof Class || item instanceof Variable)) {
            return undefined;
        }

        return findRenderJSX(item);
    }

    private static getJSXAttributeValueItem(value: string, jsx: JSX) {
        if (value == "this") {
            return jsx.item;
        }

        const c = jsx.item.file?.classes.get(value);

        if (c) {
            return c;
        }

        const v = jsx.item.file?.variables.get(value);
        if (v) {
            return v;
        }

        return jsx.item.file?.imports.get(value)?.imported;
    }

    private static getChildren(jsx: JSX): JSX[] {
        const result: JSX[] = [];

        if (jsx._parentUsedAst && jsx._parent) {
            const parentUsedAttributes = JSX.getJsxAttributes(jsx._parentUsedAst, jsx._parent);

            if (parentUsedAttributes.size > 0) {
                parentUsedAttributes.forEach((value, key) => {
                    const tagName = this.getTagName(value);
                    if (tagName) {
                        const cls = JSX.findClass(tagName, jsx._parent!);
                        if (cls) {
                            result.push(new JSX(cls, jsx._parent, value));
                        } else {
                            console.log("Not found tag " + tagName + " in file " + jsx._parent?.item.file?.location);
                        }
                    } else {
                        console.log("Tag name is empty in file " + jsx._parent?.item.file?.location);
                    }
                });
            }
        }
        if (jsx._ast) {
            if (ts.isJsxSelfClosingElement(jsx._ast)) {
                return result;
            }

            jsx._ast.children.forEach(child => {
                JSX.processChild(child, result, jsx);
            });
        } else if (jsx._parentUsedAst && jsx._parent) {
            if (ts.isJsxSelfClosingElement(jsx._parentUsedAst)) {
                return result;
            }

            jsx._parentUsedAst.children.forEach(child => {
                JSX.processChild(child, result, jsx._parent!);
            });
        }

        return result;
    }

    private static processChild(child: ts.JsxText | ts.JsxExpression | ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment, result: JSX[], jsx: JSX) {
        if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
            const tagName = this.getTagName(child);
            if (tagName) {
                const cls = JSX.findClass(tagName, jsx);
                if (cls) {
                    result.push(new JSX(cls, jsx, child));
                } else {
                    console.log("Not found tag " + tagName + " in file " + jsx._item.file?.location);
                }
            } else {
                console.log("Tag name is empty in file " + jsx._item.file?.location);
            }
            return;
        }

        if (ts.isJsxText(child)) {
            if (child.text.trim().length == 0) {
                return;
            }
        }

        if (ts.isJsxExpression(child)) {
            if (child.expression) {
                if (ts.isIdentifier(child.expression)
                    || ts.isCallExpression(child.expression)) {
                    const jsxElement = JSX.getJsxElement(child.expression.getText(), jsx);

                    if (jsxElement) {
                        const tagName = JSX.getTagName(jsxElement);
                        if (tagName) {
                            const cls = JSX.findClass(tagName, jsx);
                            if (cls) {
                                result.push(new JSX(cls, jsx, jsxElement));
                            } else {
                                console.log("Not found tag " + tagName + " in file " + jsx._item.file?.location);
                            }
                        } else {
                            console.log("Tag name is empty in file " + jsx._item.file?.location);
                        }
                    }
                } else if (ts.isConditionalExpression(child.expression)) {
                    const whenTrue = extractJSX(child.expression.whenTrue);
                    const whenFalse = extractJSX(child.expression.whenFalse);

                    if (whenTrue) {
                        const tagName = JSX.getTagName(whenTrue);
                        if (tagName) {
                            const cls = JSX.findClass(tagName, jsx);
                            if (cls) {
                                result.push(new JSX(cls, jsx, whenTrue));
                            } else {
                                console.log("Not found tag " + tagName + " in file " + jsx._item.file?.location);
                            }
                        } else {
                            console.log("Tag name is empty in file " + jsx._item.file?.location);
                        }
                    }

                    if (whenFalse) {
                        const tagName = JSX.getTagName(whenFalse);
                        if (tagName) {
                            const cls = JSX.findClass(tagName, jsx);
                            if (cls) {
                                result.push(new JSX(cls, jsx, whenFalse));
                            } else {
                                console.log("Not found tag " + tagName + " in file " + jsx._item.file?.location);
                            }
                        } else {
                            console.log("Tag name is empty in file " + jsx._item.file?.location);
                        }
                    }

                } else {
                    console.log("\"" + child.getText() + "\" is not supported. Its type is JsxExpression. Its expression type is " + ts.SyntaxKind[child.expression.kind]);
                }
            }
            return;
        }

        console.log("\"" + child.getText() + "\" is not supported. Its type is " + ts.SyntaxKind[child.kind]);
    }

    private static findClass(name: string, jsx: JSX): Class | Variable | undefined {
        const c = jsx.item.file?.classes.get(name);
        if (c) {
            return c;
        }

        const v = jsx.item.file?.variables.get(name);
        if (v) {
            return v;
        }

        const ob = jsx.item.file?.objectBinds.get(name);
        if (ob) {
            return ob.base;
        }

        const i = jsx.item.file?.imports.get(name)?.imported

        if (i) {
            if (i instanceof Class || i instanceof Variable) {
                return i;
            } else {
                console.log("Tag " + name + " is not a class in file " + jsx.item.file?.location);
            }
        }

        return undefined;
    }

    public static PrintJSX(jsx: JSX, indent: number = 0) {
        if (jsx.children.length == 0) {
            let tag = "\t".repeat(indent) + "<" + jsx.tagName;

            jsx.attributes.forEach((value, key) => {
                if (value) {
                    tag += " " + key + "=\"" + value + "\"";
                } else {
                    tag += " " + key;
                }
                return;
            });

            tag += " />";
            console.log(tag);
            return;
        }

        let tag = "\t".repeat(indent) + "<" + jsx.tagName;
        jsx.attributes.forEach((value, key) => {
            if (value) {
                tag += " " + key + "=\"" + value + "\"";
            } else {
                tag += " " + key;
            }
            return;
        });
        tag += " >";

        console.log(tag);

        jsx.children.forEach(child => {
            JSX.PrintJSX(child, indent + 1);
        });

        console.log("\t".repeat(indent) + "</" + jsx.tagName + ">");
    }
}