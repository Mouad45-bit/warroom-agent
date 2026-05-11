// /src/config/appConfig.js

export const appConfig = {
    useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true',
    useMockAuth: import.meta.env.VITE_USE_MOCK_AUTH === 'true',

    pagination: {
        auditLogPageSize: 10,
        defaultPageSize: 10,
    },

    text: {
        minBodyClass: 'text-sm',
        minMetaClass: 'text-xs',
        minLabelClass: 'text-xs',
    },

    minChars: {
        statusJustification: 10,
        addNote: 10,
        falsePositiveJustification: 10,
        escalationTriageNote: 10,
        closeIncidentSummary: 10,
        countermeasureDescription: 5,
        reassignReason: 5,
    },
};