import { api } from './client'

export async function getAgents() {
    const response = await api.get('/api/supervision/agents')
    return response.data
}

export async function getAgentDetail(agentId) {
    const response = await api.get(`/api/supervision/agents/${agentId}`)
    return response.data
}

export async function updateAgentConfig(agentId, config) {
    const response = await api.put(`/api/admin/agents/${agentId}/config`, config)
    return response.data
}
