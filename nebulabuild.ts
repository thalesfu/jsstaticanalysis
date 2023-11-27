import Repository from "./staticanalysis/repository";
import {buildTSCodeImports} from "./tsnebula/nebulabuild";

const filePath = process.argv[2];

const repo = new Repository(filePath);

 buildTSCodeImports(repo);