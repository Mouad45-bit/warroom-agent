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
// "final" empêche l'héritage. Cette classe est un utilitaire pur.
public final class RetryExecutor {

    // Constructeur privé : empêche de faire un "new RetryExecutor()".
    // Comme toutes les méthodes sont "static", on n'a pas besoin d'instancier cette classe.
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
    // "<T>" déclare que cette méthode est "Générique". Elle peut retourner n'importe quel type
    // d'objet (String, AgentIdentity, etc.), défini au moment où on l'appelle.
    // Un "Supplier<T>" représente un bloc de code (une fonction lambda) qui ne prend aucun paramètre
    // mais qui retourne un objet de type T. Ce bloc n'est exécuté que lorsqu'on appelle ".get()".
    public static <T> Optional<T> execute(
            Supplier<T> operation,
            RetryPolicy policy,
            String label
    ) {
        // On initialise le délai d'attente avec la valeur de départ définie dans la politique.
        long currentDelay = policy.initialDelayMs();

        // Boucle d'essais. Elle tourne de 1 jusqu'au nombre max d'essais autorisé.
        // Si maxAttempts est Integer.MAX_VALUE (comme dans la politique background), ça tourne à l'infini.
        for (int attempt = 1; attempt <= policy.maxAttempts(); attempt++) {
            try {
                // On exécute LA VRAIE logique métier passée en paramètre.
                T result = operation.get();

                // Si on a réussi, mais qu'il a fallu plus d'un essai, on logue que la résilience a fonctionné.
                if (attempt > 1) {
                    System.out.println("[RetryExecutor] " + label + " succeeded on attempt " + attempt + ".");
                }

                // On enveloppe le résultat dans un Optional et on le retourne. La boucle s'arrête ici en cas de succès.
                return Optional.of(result);

            } catch (Exception e) {
                // Si operation.get() lève une exception (ex: serveur injoignable), on arrive ici.
                System.err.println("[RetryExecutor] " + label + " failed (attempt " + attempt
                        + "/" + policy.maxAttempts() + ") : " + e.getMessage());

                // Si c'était notre tout dernier essai, on abandonne.
                if (attempt == policy.maxAttempts()) {
                    System.err.println("[RetryExecutor] " + label + " : all attempts exhausted.");
                    // On retourne "vide", ce qui permet au code appelant de gérer l'échec sans crasher.
                    return Optional.empty();
                }

                // Avant de réessayer, on met le thread en pause.
                // applyJitter modifie légèrement le délai pour éviter l'effet "troupeau" (thundering herd).
                sleep(applyJitter(currentDelay));

                // CALCUL DU BACKOFF EXPONENTIEL :
                // On multiplie le délai actuel (ex: 1s) par le multiplicateur (ex: 2.0) -> prochain délai = 2s.
                // Math.min s'assure que ce nouveau délai ne dépasse jamais le plafond (maxDelayMs, ex: 60s).
                currentDelay = Math.min(
                        (long) (currentDelay * policy.multiplier()),
                        policy.maxDelayMs()
                );
            }
        }

        // Par sécurité de compilation, bien que logiquement le "return" dans le "if (attempt == maxAttempts)"
        // ou le "return" dans le "try" couvriront tous les cas.
        return Optional.empty();
    }

    /**
     * Variante qui exécute une action sans valeur de retour (Runnable).
     * Retourne true si l'opération a réussi.
     */
    // C'est une méthode surchargée (même nom, paramètres différents).
    // Elle prend un "Runnable" (un bloc de code qui ne retourne RIEN, ex: une simple méthode void).
    public static boolean execute(
            Runnable operation,
            RetryPolicy policy,
            String label
    ) {
        // On réutilise la méthode principale en trichant un peu : on enveloppe le Runnable
        // dans un Supplier qui renvoie toujours "Boolean.TRUE" après avoir exécuté l'opération.
        return execute(() -> {
            operation.run();
            return Boolean.TRUE;
        }, policy, label).isPresent(); // .isPresent() renvoie true si le résultat contient une valeur (succès).
    }

    /**
     * Applique un jitter de ±25 % pour étaler les retries.
     */
    // LE JITTER EST CRUCIAL EN SYSTÈME DISTRIBUÉ.
    // Si 1000 agents perdent la connexion en même temps, et qu'ils réessaient tous EXACTEMENT dans 5 secondes,
    // ils vont DDoS (surcharger) le serveur d'un coup.
    private static long applyJitter(long delayMs) {
        // ThreadLocalRandom génère un nombre aléatoire entre 0.0 et 1.0 (très rapide en multi-threading).
        // Le calcul : 0.75 + (0 à 1 * 0.5) donne un multiplicateur aléatoire situé entre 0.75 et 1.25.
        double jitter = 0.75 + (ThreadLocalRandom.current().nextDouble() * 0.5);
        return (long) (delayMs * jitter);
    }

    // Méthode utilitaire pour cacher le try/catch obligatoire lié à "Thread.sleep()".
    private static void sleep(long ms) {
        try {
            // Met en pause le thread courant pendant X millisecondes.
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            // Si le thread est réveillé de force pendant son sommeil (ex: arrêt de l'agent),
            // on restaure le flag d'interruption pour que la JVM sache qu'il doit s'arrêter proprement.
            Thread.currentThread().interrupt();
        }
    }
}