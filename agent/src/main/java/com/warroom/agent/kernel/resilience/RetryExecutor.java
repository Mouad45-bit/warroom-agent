package com.warroom.agent.kernel.resilience;

import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

/**
 * Exécute une opération faillible avec retry et backoff exponentiel.
 *
 * Le jitter (±25 % du délai) évite que plusieurs agents
 * ne bombardent le serveur au même moment après une panne.
 *
 * Usage :
 *   Optional<AgentIdentity> identity = RetryExecutor.execute(
 *       () -> enrollmentClient.enroll(...),
 *       RetryPolicy.boot(),
 *       "enrollment"
 *   );
 */
public final class RetryExecutor {

    private RetryExecutor() {
        // Classe utilitaire.
    }

    /**
     * Exécute le supplier jusqu'à succès ou épuisement des tentatives.
     *
     * @param operation   l'opération à tenter
     * @param policy      politique de retry (nombre de tentatives, délais)
     * @param label       nom lisible pour les logs
     * @param <T>         type de retour de l'opération
     * @return Optional contenant le résultat si succès, vide sinon
     */
    public static <T> Optional<T> execute(
            Supplier<T> operation,
            RetryPolicy policy,
            String label
    ) {
        long currentDelay = policy.initialDelayMs();

        for (int attempt = 1; attempt <= policy.maxAttempts(); attempt++) {
            try {
                T result = operation.get();
                if (attempt > 1) {
                    System.out.println("[Retry] " + label + " succeeded on attempt " + attempt + ".");
                }
                return Optional.of(result);
            } catch (Exception e) {
                System.err.println("[Retry] " + label + " failed (attempt " + attempt
                        + "/" + policy.maxAttempts() + ") : " + e.getMessage());

                if (attempt == policy.maxAttempts()) {
                    System.err.println("[Retry] " + label + " : all attempts exhausted.");
                    return Optional.empty();
                }

                sleep(applyJitter(currentDelay));
                currentDelay = Math.min(
                        (long) (currentDelay * policy.multiplier()),
                        policy.maxDelayMs()
                );
            }
        }

        return Optional.empty();
    }

    /**
     * Variante qui exécute une action sans valeur de retour (Runnable).
     * Retourne true si l'opération a réussi.
     */
    public static boolean execute(
            Runnable operation,
            RetryPolicy policy,
            String label
    ) {
        return execute(() -> {
            operation.run();
            return Boolean.TRUE;
        }, policy, label).isPresent();
    }

    /**
     * Applique un jitter de ±25 % pour étaler les retries.
     */
    private static long applyJitter(long delayMs) {
        double jitter = 0.75 + (ThreadLocalRandom.current().nextDouble() * 0.5);
        return (long) (delayMs * jitter);
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}