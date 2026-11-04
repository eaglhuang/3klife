import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const packageRoot=fileURLToPath(new URL('../',import.meta.url));
const rows=[];
for (const path of ['core/systems/MercenaryBond.ts','core/systems/MercenaryBondPermanent.ts','core/systems/MercenaryUpkeep.ts','core/systems/MercenaryTrialDay.ts','core/systems/MercenaryRoster.ts','core/systems/SageDivination.ts','ui/core/SageOracleController.ts','core/managers/GameSession.ts']) {
 try {await import(new URL('../evidence/assets/scripts/'+path,import.meta.url)); rows.push({path,status:'IMPORT_OK_NOT_FULL_SUITE'});}
 catch(e){rows.push({path,status:'NOT_RUN_NATIVE_MODULE',name:e.name,reason:e.message.split(packageRoot).join('<PACKAGE_ROOT>/')});}
}
fs.writeFileSync(new URL('./native-imports.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
