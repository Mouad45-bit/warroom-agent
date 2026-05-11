import { api } from './client';

export async function getL2Users() {
    const response = await api.get('/api/users/l2');
    return response.data;
}