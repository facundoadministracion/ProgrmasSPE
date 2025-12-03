'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, addDoc, serverTimestamp, query, getDocs, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIAS_TUTORIAS, PROGRAMAS } from '@/lib/constants';
import type { Configuracion } from './ConfiguracionHistorial';

interface MontosState {
    [key: string]: number | string;
}

interface ConfiguracionFormProps {
    onConfigSave: () => void;
    configToEdit?: Configuracion | null;
    onFinishEditing: () => void;
}

const MESES = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

const ConfiguracionForm: React.FC<ConfiguracionFormProps> = ({ onConfigSave, configToEdit, onFinishEditing }) => {
    const db = useFirestore();
    const { toast } = useToast();
    
    const getInitialMontos = () => {
        const initialState: MontosState = {};
        CATEGORIAS_TUTORIAS.forEach(cat => initialState[cat] = '');
        initialState['Empleo Joven'] = '';
        initialState['Tecnoempleo'] = '';
        return initialState;
    }

    const [montos, setMontos] = useState<MontosState>(getInitialMontos());
    const [mesVigencia, setMesVigencia] = useState<string>(String(new Date().getMonth() + 1));
    const [anoVigencia, setAnoVigencia] = useState<string>(String(currentYear));
    const [actoAdministrativo, setActoAdministrativo] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isEditMode = !!configToEdit;

    useEffect(() => {
        if (configToEdit) {
            const formMontos: MontosState = { ...getInitialMontos() };
            for(const key in configToEdit.montos) {
                // Mapeo de nombres de programa a nombres de campo de formulario
                if (key === PROGRAMAS.JOVEN) formMontos['Empleo Joven'] = configToEdit.montos[key];
                else if (key === PROGRAMAS.TECNO) formMontos.Tecnoempleo = configToEdit.montos[key];
                else if (CATEGORIAS_TUTORIAS.includes(key)) formMontos[key] = configToEdit.montos[key];
            }

            setMontos(formMontos);
            setMesVigencia(String(configToEdit.mesVigencia));
            setAnoVigencia(String(configToEdit.anoVigencia));
            setActoAdministrativo(configToEdit.actoAdministrativo);
        } else {
            resetForm();
        }
    }, [configToEdit]);

    const handleMontoChange = (name: string, value: string) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        setMontos(prev => ({ ...prev, [name]: numericValue }));
    };

    const formatNumber = (value: number | string) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return value.toLocaleString('es-AR');
        if (value === '') return '';
        return parseInt(value, 10).toLocaleString('es-AR');
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return toast({ title: 'Error', description: 'No se pudo conectar a la base de datos.', variant: 'destructive' });

        const allFieldsFilled = Object.values(montos).every(m => m !== '' && m !== null && m !== undefined) && actoAdministrativo && mesVigencia && anoVigencia;
        if (!allFieldsFilled) {
            return toast({ title: 'Error', description: 'Por favor, completa todos los campos antes de guardar.', variant: 'destructive' });
        }

        setIsSaving(true);
        toast({ title: isEditMode ? 'Actualizando...' : 'Guardando...' });

        const newConfigData = {
            montos: {
                ...CATEGORIAS_TUTORIAS.reduce((acc, cat) => ({...acc, [cat]: Number(montos[cat]) }), {}),
                [PROGRAMAS.JOVEN]: Number(montos['Empleo Joven']),
                [PROGRAMAS.TECNO]: Number(montos['Tecnoempleo']),
            },
            mesVigencia: Number(mesVigencia),
            anoVigencia: Number(anoVigencia),
            actoAdministrativo,
        };

        try {
            if (isEditMode) {
                const configRef = doc(db, 'configuracionMontos', configToEdit.id);
                await updateDoc(configRef, newConfigData);
                toast({ title: 'Éxito', description: 'Configuración actualizada correctamente.' });
            } else {
                const batch = writeBatch(db);
                const q = query(collection(db, 'configuracionMontos'));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => {
                    batch.update(doc.ref, { esActiva: false });
                });

                const newConfigRef = doc(collection(db, 'configuracionMontos'));
                batch.set(newConfigRef, { ...newConfigData, fechaCreacion: serverTimestamp(), esActiva: true });
                await batch.commit();
                toast({ title: 'Éxito', description: 'Nueva configuración guardada y marcada como activa.' });
            }
            resetForm();
            onConfigSave(); // Refresca el historial
            if(isEditMode) onFinishEditing(); // Limpia el estado de edicion

        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo guardar la configuración.', variant: 'destructive' });
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setMontos(getInitialMontos());
        setActoAdministrativo('');
        setMesVigencia(String(new Date().getMonth() + 1));
        setAnoVigencia(String(currentYear));
    }

    const handleCancelEdit = () => {
        onFinishEditing();
        resetForm();
    }

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="space-y-6">
                <h3 className="font-semibold text-lg">Valores para Programas</h3>
                 <div className="space-y-4 p-4 border rounded-md">
                    <Label className="font-medium">Tutorías (Por Categoría)</Label>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                        {CATEGORIAS_TUTORIAS.map(cat => (
                            <div key={cat} className="space-y-1">
                                <Label htmlFor={cat}>{cat}</Label>
                                <Input id={cat} type="text" value={formatNumber(montos[cat])} onChange={e => handleMontoChange(cat, e.target.value)} placeholder="0" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-4 p-4 border rounded-md">
                     <Label className="font-medium">Otros Programas (Fijo)</Label>
                     <div className="space-y-1">
                        <Label htmlFor="empleo-joven">Empleo Joven</Label>
                        <Input id="empleo-joven" type="text" value={formatNumber(montos['Empleo Joven'])} onChange={e => handleMontoChange('Empleo Joven', e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="tecnoempleo">Tecnoempleo</Label>
                        <Input id="tecnoempleo" type="text" value={formatNumber(montos['Tecnoempleo'])} onChange={e => handleMontoChange('Tecnoempleo', e.target.value)} placeholder="0" />
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                 <h3 className="font-semibold text-lg">Datos del Registro</h3>
                 <div className="p-4 border rounded-md space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="mes-vigencia">Mes de Vigencia</Label>
                            <Select value={mesVigencia} onValueChange={setMesVigencia}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MESES.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="ano-vigencia">Año</Label>
                             <Select value={anoVigencia} onValueChange={setAnoVigencia}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="acto-administrativo">Acto Administrativo / Decreto</Label>
                        <Input id="acto-administrativo" value={actoAdministrativo} onChange={e => setActoAdministrativo(e.target.value)} placeholder="Ej: Dec. N° 123/25" />
                    </div>
                </div>
                 <div className="flex justify-end items-center gap-4 pt-6">
                    {isEditMode && <Button type="button" variant="ghost" onClick={handleCancelEdit}>Cancelar</Button>}
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? (isEditMode ? 'Guardando Cambios...' : 'Guardando...') : (isEditMode ? 'Guardar Cambios' : 'Guardar Nueva Configuración')}
                    </Button>
                </div>
            </div>
        </form>
    );
};

export default ConfiguracionForm;
