package com.warroom.agent.kernel.resilience;

/**
 * Configuration d'une politique de retry avec backoff exponentiel.
 *
 * Deux factories couvrent les cas d'usage de l'agent :
 * - boot() : peu de tentatives, délais courts (on veut démarrer vite) ;
 * - background() : tentatives infinies, délais longs (on attend patiemment).
 */
public record RetryPolicy(
        int maxAttempts,
        long initialDelayMs,
        long maxDelayMs,
        double multiplier
) {

    /**
     * Politique de boot : 5 tentatives, 1s → 2s → 4s → 8s → 16s.
     * Durée totale max ≈ 31 secondes.
     * Si ça échoue, l'agent démarre en mode dégradé.
     */
    public static RetryPolicy boot() {
        return new RetryPolicy(5, 1_000, 16_000, 2.0);
    }

    /**
     * Politique background : tentatives infinies, 5s → 10s → ... → 60s max.
     * Utilisé par le thread daemon qui retente l'enrollment en arrière-plan.
     */
    public static RetryPolicy background() {
        return new RetryPolicy(Integer.MAX_VALUE, 5_000, 60_000, 2.0);
    }
}