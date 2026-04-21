package com.warroom.agent.collectors;



import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.kernel.model.ComponentHealth;
import com.warroom.agent.kernel.supervisor.ManagedComponent;
import com.warroom.agent.transmission.LocalEventQueue;
import com.warroom.agent.transmission.model.RawEvent;

import java.io.BufferedReader;
import java.io.InputStreamReader;

public class CommandCollector implements ManagedComponent {

    private final LocalEventQueue eventQueue;
    private boolean running = false;

    public CommandCollector(LocalEventQueue eventQueue) {
        this.eventQueue = eventQueue; // La file d'attente partagée [cite: 363]
    }

    @Override
    public String name() {
        return "CommandCollector";
    }

    @Override
    public void start(AgentConfig config) {
        this.running = true;
        // On lance la détection dans un nouveau Thread pour ne pas bloquer l'agent
        new Thread(() -> {
            while (running) {
                try {
                    checkSuspiciousPorts();
                    // On attend 30 secondes avant la prochaine vérification [cite: 199]
                    Thread.sleep(30000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }).start();
    }

    private void checkSuspiciousPorts() {
        try {
            // Utilisation de ProcessBuilder pour exécuter une commande Linux
            ProcessBuilder pb = new ProcessBuilder("netstat", "-tuln");
            Process process = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;

            while ((line = reader.readLine()) != null) {
                if (line.contains(":4444")) { // Exemple de port souvent utilisé par des malwares
                    // On crée l'événement et on le met dans la file [cite: 365, 372]
                    eventQueue.offer(new RawEvent("command.network", "CRITICAL: Suspicious port 4444 detected in LISTEN mode."));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void stop() {
        this.running = false;
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    @Override
    public ComponentHealth health() {
        return new ComponentHealth(name(), running, running ? "Scanning network ports..." : "Inactive");
    }
}
