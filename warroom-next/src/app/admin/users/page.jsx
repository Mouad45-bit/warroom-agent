'use client';

import AppShell from '../../../components/layout/AppShell';
import UsersPage from '@/pages/UsersPage';

export default function AdminUsers() {
    return (
        <AppShell allowedRoles={['MANAGER', 'ADMIN']}>
            <UsersPage />
        </AppShell>
    );
}
