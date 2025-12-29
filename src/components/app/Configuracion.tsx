'use client';
import React, { useState, useCallback } from 'react';
import ConfiguracionHistorial from './ConfiguracionHistorial';
import ConfiguracionForm from './ConfiguracionForm';
import UploadHistory from './UploadHistory'; // Changed to UploadHistory
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';

const Configuracion = () => {
    const [isFormOpen, setFormOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<any>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleEdit = useCallback((config: any) => {
        setEditingConfig(config);
        setFormOpen(true);
    }, []);

    const handleCancel = () => {
        setFormOpen(false);
        setEditingConfig(null);
    };

    const handleSuccess = () => {
        setFormOpen(false);
        setEditingConfig(null);
        setRefreshKey(prev => prev + 1);
    };

    const handleAddNew = () => {
        setEditingConfig(null);
        setFormOpen(true);
    };

    return (
        <div className="space-y-12">
            {/* Section for Amount Configuration */}
            <section>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Configuración de Montos</h1>
                        <p className="text-gray-500">Gestión de las configuraciones de montos para los programas.</p>
                    </div>
                    {!isFormOpen && (
                        <Button onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Nueva Configuración
                        </Button>
                    )}
                </div>
                
                <div className="border-t pt-6">
                    {isFormOpen ? (
                        <ConfiguracionForm 
                            configToEdit={editingConfig}
                            onConfigSave={handleSuccess} 
                            onFinishEditing={handleCancel} 
                        />
                    ) : (
                        <ConfiguracionHistorial onEditConfig={handleEdit} forceUpdateKey={refreshKey} />
                    )}
                </div>
            </section>

            {/* Section for Upload History */}
            <section>
                <UploadHistory />
            </section>
        </div>
    );
};

export default Configuracion;
