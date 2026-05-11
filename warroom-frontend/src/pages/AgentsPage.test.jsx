import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AgentsPage from './AgentsPage'

const { apiGetMock, apiPutMock, authState } = vi.hoisted(() => ({
    apiGetMock: vi.fn(),
    apiPutMock: vi.fn(),
    authState: {
        currentUser: {
            fullName: 'Alice Admin',
            role: 'ADMIN',
        },
    },
}))

vi.mock('../api/client', () => ({
    default: {
        get: apiGetMock,
        put: apiPutMock,
    },
    api: {
        get: apiGetMock,
        put: apiPutMock,
    },
}))

vi.mock('../config/appConfig', () => ({
    appConfig: {
        useMockApi: false,
    },
}))

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: authState.currentUser,
    }),
}))

function makeAgents() {
    return [
        {
            agentId: 'agt-a1',
            hostname: 'srv-web-01',
            osName: 'Ubuntu',
            osVersion: '22.04',
            lastSeenAt: '2026-05-11T11:59:40Z',
            healthStatus: 'GREEN',
            activeCollectors: 4,
            totalCollectors: 4,
        },
    ]
}

function makeAgentDetail() {
    return {
        agent: {
            agentId: 'agt-a1',
            hostname: 'srv-web-01',
            osName: 'Ubuntu',
            osVersion: '22.04',
            agentVersion: '1.0',
            enrolledAt: '2026-05-01T08:00:00Z',
            lastSeenAt: '2026-05-11T11:59:40Z',
            healthStatus: 'GREEN',
            heartbeatIntervalSeconds: 30,
            batchSize: 100,
            retryIntervalSeconds: 10,
            enabledCollectors: ['LogCollector', 'NetworkCollector'],
        },
        latestHealth: {
            timestamp: '2026-05-11T11:59:40Z',
            isRunning: true,
            queuedEvents: 2,
            deliveredEvents: 140,
            failedBatches: 0,
            droppedEvents: 0,
            enrollmentRetries: 0,
            configRefreshFailures: 0,
            componentRestarts: 0,
            components: [
                {
                    name: 'LogCollector',
                    status: 'RUNNING',
                    statusMessage: 'OK',
                    lastStartedAt: '2026-05-11T08:00:00Z',
                    restartCount: 0,
                },
                {
                    name: 'NetworkCollector',
                    status: 'RUNNING',
                    statusMessage: 'OK',
                    lastStartedAt: '2026-05-11T08:00:00Z',
                    restartCount: 0,
                },
            ],
        },
        heartbeatHistory: [
            {
                timestamp: '2026-05-11T11:58:40Z',
                healthStatus: 'GREEN',
                queuedEvents: 1,
                deliveredEvents: 120,
                isRunning: true,
            },
        ],
    }
}

beforeEach(() => {
    authState.currentUser = {
        fullName: 'Alice Admin',
        role: 'ADMIN',
    }

    apiGetMock.mockReset()
    apiPutMock.mockReset()
    apiPutMock.mockResolvedValue({ data: {} })
    apiGetMock.mockImplementation(async (url) => {
        if (url === '/api/supervision/agents') {
            return { data: makeAgents() }
        }

        if (url === '/api/supervision/agents/agt-a1') {
            return { data: makeAgentDetail() }
        }

        throw new Error(`Unexpected GET ${url}`)
    })
})

describe('AgentsPage', () => {
    it('charge la liste via /api/supervision/agents', async () => {
        render(<AgentsPage />)

        expect(await screen.findByText('srv-web-01')).toBeInTheDocument()

        await waitFor(() => {
            expect(apiGetMock).toHaveBeenCalledWith('/api/supervision/agents')
        })
    })

    it('charge le détail via /api/supervision/agents/{agentId}', async () => {
        const user = userEvent.setup()

        render(<AgentsPage />)

        await user.click(await screen.findByText('srv-web-01'))

        await waitFor(() => {
            expect(apiGetMock).toHaveBeenCalledWith('/api/supervision/agents/agt-a1')
        })
    })

    it('sauvegarde la configuration via /api/admin/agents/{agentId}/config', async () => {
        const user = userEvent.setup()

        render(<AgentsPage />)

        await user.click(await screen.findByText('srv-web-01'))
        await user.click(await screen.findByText('Modifier la configuration'))
        await user.click(await screen.findByText('Appliquer'))

        await waitFor(() => {
            expect(apiPutMock).toHaveBeenCalledWith(
                '/api/admin/agents/agt-a1/config',
                expect.objectContaining({
                    heartbeatIntervalSeconds: 30,
                    batchSize: 100,
                    retryIntervalSeconds: 10,
                    enabledCollectors: ['LogCollector', 'NetworkCollector'],
                })
            )
        })
    })
})