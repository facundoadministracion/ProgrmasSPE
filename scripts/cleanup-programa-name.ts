
import { db } from '../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// db is now imported directly and is already initialized.

async function cleanupOldProgramName() {
  const participantsRef = db.collection('participants');
  const snapshot = await participantsRef.get();

  if (snapshot.empty) {
    console.log('No participants found.');
    return;
  }

  const batch = db.batch();
  let updatedCount = 0;
  const oldProgramNameKey = 'empleo joven';

  console.log(`Checking ${snapshot.size} participant documents for the old key '${oldProgramNameKey}'...`);

  snapshot.forEach(doc => {
    const participant = doc.data();
    if (participant.pagosPorPrograma && participant.pagosPorPrograma[oldProgramNameKey] !== undefined) {
      // Key exists, add an update to the batch to delete it.
      batch.update(doc.ref, { [`pagosPorPrograma.${oldProgramNameKey}`]: FieldValue.delete() });
      updatedCount++;
      console.log(`- Marked participant ${doc.id} (${participant.nombre}) for update.`);
    }
  });

  if (updatedCount > 0) {
    console.log(`\nFound ${updatedCount} participants to update. Committing changes...`);
    await batch.commit();
    console.log('\nCleanup successful! All specified keys have been removed.');
  } else {
    console.log('\nNo participants needed updating. The data is already clean.');
  }
}

cleanupOldProgramName().catch(error => {
  console.error('An error occurred during the cleanup script:', error);
});
