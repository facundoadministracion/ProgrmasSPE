const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// --- Inicialización Segura de Firebase Admin ---
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const firestore = admin.firestore();

// --- Constantes y Funciones de Utilidad ---
const DEPARTAMENTOS = [
    'Arauco', 'Capital', 'Castro Barros', 'Chamical', 'Chilecito', 'Famatina', 
    'Felipe Varela', 'General Belgrano', 'General Lamadrid', 'General Ocampo', 
    'General San Martín', 'Independencia', 'Rosario Vera Peñaloza', 'San Blas de los Sauces', 
    'Sanagasta', 'Vinchina', 'Ángel Vicente Peñaloza'
];

const normalizeDepartmentName = (name) => {
  const defaultName = 'No especificado';
  if (!name || !name.trim()) return defaultName;
  let normalized = name.trim().toLowerCase().replace(/pealoza/g, 'peñaloza').replace(/^gral\.? /g, 'general ');
  const match = DEPARTAMENTOS.find(d => d.toLowerCase() === normalized);
  if (match) return match;
  if (normalized.includes('angel vicente')) return 'Ángel Vicente Peñaloza';
  if (normalized.includes('felipe varela')) return 'Felipe Varela';
  if (normalized.includes('rosario vera')) return 'Rosario Vera Peñaloza';
  return defaultName;
};

// --- Función Principal del Informe ---
const runReport = async (mes, anio) => {
    console.log(`\n--- Generando Informe Geográfico para ${mes}/${anio} ---\n`);

    try {
        console.log('Paso 1: Consultando pagos registrados...');
        const paymentsQuery = firestore.collection('pagosRegistrados')
            .where('mes', '==', mes)
            .where('anio', '==', anio);
        const paymentsSnapshot = await paymentsQuery.get();
        
        if (paymentsSnapshot.empty) {
            console.log('\n>> No se encontraron pagos registrados para este período.\n');
            return;
        }
        console.log(`>> Se encontraron ${paymentsSnapshot.size} registros de pago.`);

        const payments = paymentsSnapshot.docs.map(doc => ({
            dni: doc.data().dni,
            montoPagado: doc.data().montoPagado || doc.data().monto,
        }));

        const dnis = [...new Set(payments.map(p => p.dni).filter(Boolean))];
        
        if (dnis.length === 0) {
            console.log('\n>> No hay DNIs válidos en los registros de pago encontrados.\n');
            return;
        }
        
        console.log('\nPaso 2: Buscando participantes por DNI...');
        const participantMap = new Map();
        
        const chunks = [];
        for (let i = 0; i < dnis.length; i += 30) {
            chunks.push(dnis.slice(i, i + 30));
        }

        await Promise.all(chunks.map(async (chunk, index) => {
            if (chunk.length === 0) return;
            const participantsQuery = firestore.collection('participants').where('dni', 'in', chunk); // <-- CORRECCIÓN AQUI
            const participantsSnapshot = await participantsQuery.get();
            participantsSnapshot.docs.forEach(doc => {
                const pData = doc.data();
                if (pData.dni) {
                    participantMap.set(String(pData.dni), {
                        departamento: pData.departamento
                    });
                }
            });
            console.log(`>> Lote ${index + 1}/${chunks.length} de DNIs procesado.`);
        }));
        
        console.log(`>> Se encontraron datos para ${participantMap.size} participantes únicos.`);

        console.log('\nPaso 3: Agregando y generando el informe...');
        const reportData = {};

        payments.forEach(payment => {
            const participant = participantMap.get(String(payment.dni));
            const department = normalizeDepartmentName(participant?.departamento);
            
            if (!reportData[department]) {
                reportData[department] = {
                    count: 0,
                    totalAmount: 0,
                };
            }
            
            reportData[department].count += 1;
            reportData[department].totalAmount += payment.montoPagado || 0;
        });

        console.log('\n--------------------------------------------------');
        console.log('          INFORME FINALIZADO          ');
        console.log('--------------------------------------------------');
        
        const sortedReport = Object.entries(reportData).sort(([, a], [, b]) => b.count - a.count);

        console.log('| Departamento             | Participantes | Monto Liquidado |');
        console.log('|--------------------------|---------------|-----------------|');
        
        let grandTotalCount = 0;
        let grandTotalAmount = 0;

        sortedReport.forEach(([department, data]) => {
            grandTotalCount += data.count;
            grandTotalAmount += data.totalAmount;
            
            const departmentStr = department.padEnd(24);
            const countStr = String(data.count).padEnd(13);
            const amountStr = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(data.totalAmount).padStart(15);
            
            console.log(`| ${departmentStr} | ${countStr} | ${amountStr} |`);
        });

        console.log('|--------------------------|---------------|-----------------|');
        
        const totalCountStr = String(grandTotalCount).padEnd(13);
        const totalAmountStr = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(grandTotalAmount).padStart(15);
        console.log(`| Total General            | ${totalCountStr} | ${totalAmountStr} |`);
        console.log('--------------------------------------------------\n');

    } catch (error) {
        console.error('\n!! Ocurrió un error al generar el informe:', error);
    }
};

// --- Función para Ejecutar el Script ---
const main = async () => {
  const args = process.argv.slice(2); // Captura los argumentos: [mes, anio]

  if (args.length < 2) {
    console.error("\nError: Faltan argumentos. Debes proporcionar el mes y el año.");
    console.error("Uso: node run-geo-report.js <mes> <año>");
    console.error("Ejemplo: node run-geo-report.js 5 2024\n");
    return; // Salir si no hay suficientes argumentos
  }

  const [mes, anio] = args;

  // Validación de los argumentos
  const mesNum = parseInt(mes, 10);
  const anioNum = parseInt(anio, 10);

  if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
    console.error("\nError: Mes inválido. Debe ser un número entre 1 y 12.\n");
    return;
  }

  if (isNaN(anioNum) || anioNum < 2000 || anioNum > 2100) { // Validación básica del año
    console.error("\nError: Año inválido. Introduce un año realista (ej: 2024).\n");
    return;
  }

  await runReport(String(mesNum), String(anioNum)); // Llama a la función principal con los argumentos validados
};

main().catch(error => {
  console.error("Se ha producido un error en la ejecución principal:", error);
});
