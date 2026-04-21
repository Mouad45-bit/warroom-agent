package com.warroom.agent.transmission;

import com.warroom.agent.kernel.identity.AgentStateStore;
import com.warroom.agent.transmission.model.RawEvent;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * File d'attente locale des événements bruts.
 *
 * Modification :
 * - reçoit un AgentStateStore pour compter les événements rejetés
 *   quand la queue est pleine (droppedEvents).
 *
 * Le contrat pour ton collaborateur ne change pas :
 * il appelle offer(RawEvent) et vérifie le booléen de retour.
 */
public class LocalEventQueue {

    private static final int MAX_CAPACITY = 10_000;

    private final BlockingQueue<RawEvent> queue = new LinkedBlockingQueue<>(MAX_CAPACITY);
    private final AgentStateStore stateStore;

    public LocalEventQueue(AgentStateStore stateStore) {
        this.stateStore = stateStore;
    }

    /**
     * Méthode appelée par les collecteurs.
     *
     * Retourne false si la queue est pleine (backpressure).
     * Dans ce cas, l'événement est perdu et droppedEvents est incrémenté.
     */
    public boolean offer(RawEvent event) {
        boolean accepted = queue.offer(event);
        if (!accepted) {
            stateStore.incrementDroppedEvents();
            System.err.println("[Queue] Event dropped — queue is full (" + MAX_CAPACITY + " max).");
        }
        return accepted;
    }

    /**
     * Méthode appelée par le Batcher pour vider un lot d'événements.
     */
    public List<RawEvent> drainBatch(int batchSize) {
        List<RawEvent> batch = new ArrayList<>();
        queue.drainTo(batch, batchSize);
        return batch;
    }

    public int size() {
        return queue.size();
    }
}