'use client';

import React, { useState } from 'react';
import { type Configuracion as ConfigType } from '@/hooks/useConfiguracion';
import ConfiguracionForm from './ConfiguracionForm';
import ConfiguracionHistorial from './ConfiguracionHistorial';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Configuracion() {
    const [editingConfig, setEditingConfig] = useState<ConfigType | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [forceUpdateKey, setForceUpdateKey] = useState(0);

    const handleEdit = (config: ConfigType) => {
        setEditingConfig(config);
        setIsFormOpen(true);
    };

    const handleCancel = () => {
        setEditingConfig(null);
        setIsFormOpen(false);
    };

    const handleSuccess = () => {
        setEditingConfig(null);
        setIsFormOpen(false);
        // Forzamos la actualización del historial para que muestre los nuevos datos
        setForceUpdateKey(prev => prev + 1);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Gestión de Configuración</h1>
                {!isFormOpen && (
                    <Button onClick={() => setIsFormOpen(true)}>Nueva Configuración</Button>
                )}
            </div>

            {isFormOpen ? (
                <ConfiguracionForm 
                    configuracionActual={editingConfig}
                    onCancel={handleCancel}
                    onSuccess={handleSuccess}
                />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Configuraciones</CardTitle>
                        <CardDescription>Aquí puedes ver y editar las configuraciones de montos y programas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ConfiguracionHistorial onEditConfig={handleEdit} forceUpdateKey={forceUpdateKey} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
