'use client';

import AppShell from '../../components/layout/AppShell';
import AlertsPage from '@/pages/AlertsPage';

export default function Alerts() {
    return (
        <AppShell allowedRoles={['L1', 'L2', 'MANAGER']}>
            <AlertsPage />
        </AppShell>
    );
}
