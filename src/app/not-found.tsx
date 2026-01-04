'use client';

import React from 'react';

export default function NotFound() {
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
            <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>404 - Página No Encontrada</h1>
                <p style={{ color: '#4b5563' }}>Lo sentimos, la página que buscas no existe.</p>
            </div>
        </div>
    );
}
