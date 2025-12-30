
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/admin';

export async function GET() {
    try {
        const { firestore } = getFirebaseAdmin();

        const programName = 'Tutorías';
        const month = 11;
        const year = 2025;

        const historyRef = firestore.collection('paymentHistory');
        const q = historyRef
            .where('programa', '==', programName)
            .where('mesLiquidacion', '==', month)
            .where('anoLiquidacion', '==', year);

        const snapshot = await q.get();

        if (snapshot.empty) {
            return NextResponse.json({ message: "No documents found with the specified criteria.", data: [] });
        }

        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return NextResponse.json({ message: `${data.length} document(s) found.`, data });

    } catch (error: any) {
        console.error('[ERROR DEBUG READ]', error);
        return NextResponse.json({ message: `Server error during debug read: ${error.message}` }, { status: 500 });
    }
}
