import UIComponent from "./uicomponent";
import Repository from "../staticanalysis/repository";
import ts from "typescript";


const descriptionRegex = /\[description\]\s*(?<description>.*)\s*$/mi;
const parentRegex = /\[parentid\]\s*(?<parentid>.*)\s*$/mi;

export function analyzeUIComponents(repo: Repository): UIComponent[] {
    const uiComponents: UIComponent[] = [];

    let count = 0;

    for (const file of repo.files.values()) {
        if (!file.path.startsWith("src/autoui/")) {
            continue;
        }

        for (const cls of file.classes.values()) {
            for (const member of cls.ast.members) {
                if (member.kind === ts.SyntaxKind.PropertyDeclaration) {
                    const property = member as ts.PropertyDeclaration;
                    if (property.initializer?.kind === ts.SyntaxKind.StringLiteral) {
                        const uiComponent = new UIComponent(property.initializer.getText());
                        uiComponent.source = "class:\"" + cls.name + "\" at file:\"" + file.path + "\"";
                        const jsDocTags = ts.getJSDocCommentsAndTags(property);
                        for (const jsDocTag of jsDocTags) {
                            const descriptionMatch = descriptionRegex.exec(jsDocTag.getText());
                            if (descriptionMatch?.groups?.description) {
                                uiComponent.description = descriptionMatch.groups.description;
                            }
                            const parentMatch = parentRegex.exec(jsDocTag.getText());
                            if (parentMatch?.groups?.parentid) {
                                uiComponent.parent = parentMatch.groups.parentid;
                            }
                        }
                        uiComponents.push(uiComponent);
                        count++;
                    }
                }
            }


        }
    }

    console.log(`count ${count}`);

    return uiComponents;
}