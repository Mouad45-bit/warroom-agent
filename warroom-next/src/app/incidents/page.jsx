'use client';

import AppShell from '../../components/layout/AppShell';
import IncidentsPage from '@/pages/IncidentsPage';

export default function Incidents() {
    return (
        <AppShell allowedRoles={['L1', 'L2', 'MANAGER']}>
            <IncidentsPage />
        </AppShell>
    );
}
