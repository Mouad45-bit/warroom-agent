package com.warroom.agent.kernel.supervisor;

/**
 * États possibles d'un composant supervisé.
 *
 * - RUNNING : le composant tourne normalement.
 * - CRASHED : le composant est tombé, un redémarrage est planifié.
 * - QUARANTINED : trop de crashes récents, le supervisor a abandonné.
 *                 Nécessite une intervention (redémarrage agent ou fix config).
 * - DISABLED : décision administrative — le composant n'est pas dans
 *                 la liste enabledCollectors de la config serveur.
 *
 * La distinction CRASHED / QUARANTINED est importante :
 * - CRASHED est transitoire (le supervisor va réessayer) ;
 * - QUARANTINED est terminal (plus de tentatives automatiques).
 *
 * La distinction QUARANTINED / DISABLED est importante :
 * - QUARANTINED est un symptôme (le composant est "malade") ;
 * - DISABLED est une décision (le composant ne doit pas tourner).
 */
public enum ComponentStatus {
    RUNNING,
    CRASHED,
    QUARANTINED,
    DISABLED
}