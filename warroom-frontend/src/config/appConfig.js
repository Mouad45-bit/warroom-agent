export const appConfig = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
    useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true',
    useMockAuth: import.meta.env.VITE_USE_MOCK_AUTH === 'true',
};