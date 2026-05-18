'use client';

import AppShell from '../../components/layout/AppShell';
import AgentsPage from '@/pages/AgentsPage';

export default function Agents() {
    return (
        <AppShell allowedRoles={['MANAGER', 'ADMIN']}>
            <AgentsPage />
        </AppShell>
    );
}
