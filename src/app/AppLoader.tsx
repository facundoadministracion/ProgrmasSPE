'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const FullScreenLoader = () => (
    <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <p style={{ marginLeft: '1rem', color: '#4b5563' }}>Cargando aplicación...</p>
    </div>
);

const MainAppClient = dynamic(() => import('./MainAppClient'), {
    ssr: false,
    loading: () => <FullScreenLoader />,
});

export default function AppLoader() {
    return <MainAppClient />;
}
