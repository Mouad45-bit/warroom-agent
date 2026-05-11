import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from './DashboardPage'

const { mockNavigate, apiGetMock, apiPutMock, authState } = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    apiGetMock: vi.fn(),
    apiPutMock: vi.fn(),
    authState: {
        currentUser: {
            fullName: 'Alice Analyste',
            role: 'L1',
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

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

function makeStats() {
    return {
        alertsBySeverity: {
            CRITICAL: 2,
            HIGH: 1,
            MEDIUM: 0,
            LOW: 0,
            INFO: 0,
        },
        incidentsByStatus: {
            OPEN: 3,
            INVESTIGATING: 1,
            REMEDIATING: 1,
            RESOLVED: 2,
            CLOSED: 4,
            CLOSED_FALSE_POSITIVE: 1,
        },
        mttd24h: 120,
        mttr24h: 3600,
        agentsConnected: 4,
        agentsWarning: 1,
        agentsDisconnected: 2,
    }
}

function makeManagerStats() {
    return {
        incidentsByAssignee: [
            {
                userId: 'l2-1',
                fullName: 'L2 One',
                openCount: 2,
                totalAssigned: 6,
                avgResolutionTimeSeconds: 1800,
            },
        ],
        triageRateByL1: [
            {
                userId: 'l1-1',
                fullName: 'L1 One',
                alertsTriaged24h: 12,
                avgTriageTimeSeconds: 90,
                falsePositiveRate: 0.1,
            },
        ],
    }
}

function makeNotifications() {
    return [
        {
            id: 1,
            type: 'INCIDENT_RETURNED',
            message: 'Incident renvoyé à L1',
            createdAt: '2026-05-11T10:00:00Z',
            relatedIncidentId: 'INC-1',
        },
        {
            id: 2,
            type: 'INCIDENT_ASSIGNED',
            message: 'Incident assigné à L2',
            createdAt: '2026-05-11T11:00:00Z',
            relatedIncidentId: 'INC-2',
        },
    ]
}

beforeEach(() => {
    authState.currentUser = {
        fullName: 'Alice Analyste',
        role: 'L1',
    }

    mockNavigate.mockReset()
    apiPutMock.mockReset()
    apiGetMock.mockReset()
    apiGetMock.mockImplementation(async (url) => {
        if (url === '/api/dashboard/stats') {
            return { data: makeStats() }
        }

        if (url === '/api/dashboard/stats/manager') {
            return { data: makeManagerStats() }
        }

        if (url.startsWith('/api/dashboard/notifications')) {
            return { data: makeNotifications() }
        }

        throw new Error(`Unexpected GET ${url}`)
    })
})

describe('DashboardPage', () => {
    it('utilise les endpoints dashboard attendus et affiche la vue L1', async () => {
        render(<DashboardPage />)

        expect(await screen.findByText('Alertes par sévérité')).toBeInTheDocument()
        expect(screen.getByText('Feedback — Incidents renvoyés')).toBeInTheDocument()
        expect(screen.queryByText('Incidents par statut')).not.toBeInTheDocument()

        await waitFor(() => {
            expect(apiGetMock).toHaveBeenCalledWith('/api/dashboard/stats')
            expect(apiGetMock).toHaveBeenCalledWith('/api/dashboard/notifications')
        })
    })

    it('affiche la vue L2 avec incidents et assignations', async () => {
        authState.currentUser = {
            fullName: 'Bob Analyste',
            role: 'L2',
        }

        render(<DashboardPage />)

        expect(await screen.findByText('Incidents par statut')).toBeInTheDocument()
        expect(screen.getByText('Nouveaux incidents assignés')).toBeInTheDocument()
        expect(screen.queryByText('Alertes par sévérité')).not.toBeInTheDocument()
    })

    it('affiche pour MANAGER uniquement la performance analystes', async () => {
        authState.currentUser = {
            fullName: 'Marie Manager',
            role: 'MANAGER',
        }

        render(<DashboardPage />)

        expect(await screen.findByText('Performance L2 — Incidents')).toBeInTheDocument()
        expect(screen.getByText('Performance L1 — Triage')).toBeInTheDocument()
        expect(screen.queryByText('Alertes par sévérité')).not.toBeInTheDocument()
        expect(screen.queryByText('Incidents par statut')).not.toBeInTheDocument()
    })

    it('affiche pour ADMIN les compteurs agents', async () => {
        authState.currentUser = {
            fullName: 'Alice Admin',
            role: 'ADMIN',
        }

        render(<DashboardPage />)

        expect(await screen.findByText('Santé des agents')).toBeInTheDocument()
        expect(screen.getByText('Total agents')).toBeInTheDocument()
        expect(screen.queryByText('Performance L2 — Incidents')).not.toBeInTheDocument()
    })
})
