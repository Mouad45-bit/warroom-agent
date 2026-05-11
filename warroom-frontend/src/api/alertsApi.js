import { api } from './client';

function buildAlertQueryParams(params = {}) {
    const searchParams = new URLSearchParams();
    const {
        page,
        size,
        severity = [],
        status = [],
        sourceType = [],
        agentId,
        from,
        to,
    } = params;

    severity.forEach(value => searchParams.append('severity', value));
    status.forEach(value => searchParams.append('status', value));
    sourceType.forEach(value => searchParams.append('sourceType', value));

    if (page !== undefined && page !== null) searchParams.append('page', page);
    if (size !== undefined && size !== null) searchParams.append('size', size);
    if (agentId) searchParams.append('agentId', agentId);
    if (from) searchParams.append('from', from);
    if (to) searchParams.append('to', to);

    return searchParams;
}

export async function getAlerts(params) {
    const queryParams = buildAlertQueryParams(params);
    const response = await api.get(`/api/alerts?${queryParams.toString()}`);
    return response.data;
}

export async function getAlertDetail(alertId) {
    const response = await api.get(`/api/alerts/${alertId}`);
    return response.data;
}

export async function acknowledgeAlert(alertId) {
    const response = await api.put(`/api/alerts/${alertId}/acknowledge`);
    return response.data;
}

export async function markFalsePositive(alertId, justification) {
    const response = await api.put(`/api/alerts/${alertId}/false-positive`, { justification });
    return response.data;
}

export async function escalateAlert(alertId, payload) {
    const response = await api.put(`/api/alerts/${alertId}/escalate`, payload);
    return response.data;
}