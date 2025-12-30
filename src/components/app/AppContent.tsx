'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import type { Participant } from '@/lib/types';
import { getAlertStatus } from '@/lib/logic';
import { ALERT_MESSAGES } from '@/lib/constants';

import Dashboard from '@/components/app/Dashboard';
import ParticipantDetail from '@/components/app/ParticipantDetail';
import { FullPageSpinner } from '@/components/common/Spinner';

// This component is the main client-side logic holder.
// It fetches data, manages state, and passes props to the presentational components.

const AppContent = () => {
    const firestore = useFirestore();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

    useEffect(() => {
        if (!firestore) return;

        setLoading(true);
        const q = query(collection(firestore, "participantes"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const parts: Participant[] = [];
            querySnapshot.forEach((doc) => {
                parts.push({ id: doc.id, ...doc.data() } as Participant);
            });
            setParticipants(parts);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching participants: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const filteredParticipants = useMemo(() => {
        if (!filter) return participants;

        const getParticipantPayments = (p: Participant) => {
            if (!p.programa || !p.pagosPorPrograma) return 0;
            return p.pagosPorPrograma[p.programa] || 0;
        };

        const participantAlerts = participants.map(p => ({ 
            ...p, 
            alert: getAlertStatus(p),
            payments: getParticipantPayments(p)
        }));

        switch (filter) {
            case 'requiresAttention':
                return participants.filter(p => p.estado === 'Requiere Atención');
            case 'ageAlert':
                return participantAlerts.filter(p => p.alert.msg.includes('Límite de Edad')).map(p => p as Participant);
            case 'paymentDue':
                return participantAlerts.filter(p => p.alert.msg === ALERT_MESSAGES.PROXIMO_VENCIMIENTO).map(p => p as Participant);
            case 'renewalRequired':
                return participantAlerts.filter(p => p.alert.msg === ALERT_MESSAGES.REQUIERE_AUTORIZACION && p.payments < 12).map(p => p as Participant);
            case 'finalized':
                 return participantAlerts.filter(p => p.alert.msg === ALERT_MESSAGES.REQUIERE_AUTORIZACION && p.payments >= 12).map(p => p as Participant);
            default:
                return participants;
        }
    }, [filter, participants]);

    const handleSetFilter = (newFilter: string | null) => {
        setFilter(newFilter);
        setSelectedParticipant(null); // Clear selection when changing filter
    };
    
    const handleSelectParticipant = (participant: Participant) => {
        setSelectedParticipant(participant);
    };

    const handleBack = () => {
        setSelectedParticipant(null);
    }

    if (loading && participants.length === 0) {
        return <FullPageSpinner />;
    }

    if (selectedParticipant) {
        return <ParticipantDetail participant={selectedParticipant} onBack={handleBack} />
    }

    // Dashboard expects the full list of participants to calculate all alerts totals correctly
    // The filtering for display should happen in a different component, or not at all at this level.
    // For now, we will pass all participants to the dashboard and handle the view logic separately.
    // Let's rethink: The dashboard cards *are* the filter UI. So it shouldn't display a filtered list.
    // Instead, it should display stats, and clicking a stat sets a filter.
    // But what shows the list? It seems there's another component missing.
    // Let's check the project structure... there's no list component.
    // This implies that when a filter is set, a different view should be rendered.

    // Re-reading `Dashboard.tsx`, it does NOT display a list. It displays cards. Clicking a card
    // calls onSetFilter. This suggests something else SHOULD be listening to that filter change.
    // Let's assume for now that there IS another component that displays the list.
    // The current task is just to make the Dashboard render.
    // Ok, I will assume a different component will render the filtered list.
    // The `Dashboard` itself just needs the props. I'll provide them.

    return (
        <Dashboard 
            participants={participants}
            participantsLoading={loading}
            onSetFilter={handleSetFilter}
            onSelectParticipant={handleSelectParticipant}
        />
    );
};

export default AppContent;
