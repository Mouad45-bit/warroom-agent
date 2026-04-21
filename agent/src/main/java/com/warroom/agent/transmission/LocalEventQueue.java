package com.warroom.agent.transmission;

import com.warroom.agent.transmission.model.RawEvent;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

public class LocalEventQueue {

    // On limite à 10.000 événements en mémoire pour ne pas faire exploser la RAM de l'agent
    private final BlockingQueue<RawEvent> queue = new LinkedBlockingQueue<>(10000);

    /**
     * Méthode appelée par les collecteurs (ton collaborateur utilisera ça).
     */
    public boolean offer(RawEvent event) {
        return queue.offer(event);
    }

    /**
     * Méthode appelée par le Batcher pour vider un lot d'événements.
     */
    public List<RawEvent> drainBatch(int batchSize) {
        List<RawEvent> batch = new ArrayList<>();
        // Extrait jusqu'à "batchSize" éléments de la file et les met dans la liste "batch"
        queue.drainTo(batch, batchSize);
        return batch;
    }

    public int size() {
        return queue.size();
    }
}
