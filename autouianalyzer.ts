import Repository from "./staticanalysis/repository";
import {analyzeUIComponents} from "./autoui/analysis";
import fs from "fs";


const filePath = process.argv[2];

const repo = new Repository(filePath);

const uiComponents = analyzeUIComponents(repo);

const jsonStr = JSON.stringify(uiComponents, null, 2);

fs.writeFileSync("dist/crn_autoui.json", jsonStr, "utf-8")