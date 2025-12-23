
// inspectors/inspect-module.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('--- Iniciando inspección del módulo de Firebase Admin ---');

try {
  // Intentamos importar el módulo compilado
  const adminModule = require('../dist_scripts/src/firebase-admin.js');

  console.log('\nInspección del módulo importado (adminModule):');
  console.log(adminModule);

  if (adminModule) {
    console.log('\nClaves disponibles en adminModule:', Object.keys(adminModule));

    // CORRECTED: Escaped the single quotes around 'default'
    if ('default' in adminModule) {
      console.log('\nEl módulo tiene una exportación \'default\'. Inspeccionando adminModule.default:');
      console.log(adminModule.default);
      if (adminModule.default) {
        console.log('Claves disponibles en adminModule.default:', Object.keys(adminModule.default));
      }
    }
  }

  console.log('\n--- Inspección finalizada ---');

} catch (error) {
  console.error('\nFALLÓ LA IMPORTACIÓN. El error es:', error);
}
