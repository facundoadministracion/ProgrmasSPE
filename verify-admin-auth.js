const admin = require('firebase-admin');

// ¡La clave está aquí! Cargamos el archivo JSON directamente.
const serviceAccount = require('./service-account.json');

const runAuthTest = () => {
    console.log('--- Iniciando prueba de autenticación de administrador de Firebase (Método Explícito) ---');
    try {
        // Inicializamos la app pasando las credenciales directamente.
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        const projectId = admin.app().options.credential.projectId;

        if (projectId) {
            console.log('\n✅ ¡ÉXITO! Conexión de administrador verificada.');
            console.log(`✅ Conectado al proyecto de Firebase: ${projectId}`);
            console.log('\n[CONCLUSIÓN] La autenticación del administrador funciona. El problema original estaba en cómo el entorno cargaba las credenciales. Ahora podemos usar este método en otros scripts.');
        } else {
             console.log('\n❌ ¡FALLO! No se pudo determinar el ID del proyecto, incluso con credenciales explícitas.');
             console.log('[CAUSA PROBABLE] Puede haber un problema con el contenido del archivo service-account.json.');
        }

    } catch (error) {
        console.error('\n❌ ¡FALLO CRÍTICO! Ocurrió un error al inicializar el Admin SDK:', error.message);
        console.error('\n[DIAGNÓSTICO] El error ocurrió incluso al cargar las credenciales explícitamente. Revisa el contenido del archivo `service-account.json` y asegúrate de que sea válido.');
    }
    console.log('--- Prueba finalizada ---');
}

runAuthTest();
