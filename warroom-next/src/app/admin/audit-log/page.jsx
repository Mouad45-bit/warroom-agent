'use client';

import AppShell from '../../../components/layout/AppShell';
import AuditLogPage from '@/pages/AuditLogPage';

export default function AdminAuditLog() {
    return (
        <AppShell allowedRoles={['MANAGER', 'ADMIN']}>
            <AuditLogPage />
        </AppShell>
    );
}
