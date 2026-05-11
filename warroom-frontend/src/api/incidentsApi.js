import { api } from './client';

export async function getIncidents(params) {
    const response = await api.get('/api/incidents', { params });
    return response.data;
}

export async function getIncidentDetail(id) {
    const response = await api.get(`/api/incidents/${id}`);
    return response.data;
}

export async function takeIncident(id) {
    const response = await api.put(`/api/incidents/${id}/take`);
    return response.data;
}

export async function updateIncidentStatus(id, payload) {
    const response = await api.put(`/api/incidents/${id}/status`, payload);
    return response.data;
}

export async function reassignIncident(id, payload) {
    const response = await api.put(`/api/incidents/${id}/reassign`, payload);
    return response.data;
}

export async function returnToL1(id, payload) {
    const response = await api.put(`/api/incidents/${id}/return-to-l1`, payload);
    return response.data;
}

export async function closeIncident(id, payload) {
    const response = await api.put(`/api/incidents/${id}/close`, payload);
    return response.data;
}

export async function addIncidentNote(id, payload) {
    const response = await api.post(`/api/incidents/${id}/notes`, payload);
    return response.data;
}

export async function addCountermeasure(id, payload) {
    const response = await api.post(`/api/incidents/${id}/countermeasures`, payload);
    return response.data;
}