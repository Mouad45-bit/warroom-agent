package com.warroom.agent.collectors;

import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.kernel.model.ComponentHealth;
import com.warroom.agent.kernel.supervisor.ManagedComponent;
import com.warroom.agent.transmission.LocalEventQueue;
import com.warroom.agent.transmission.model.RawEvent;

import java.io.File;
import java.io.RandomAccessFile;

public class LogCollector implements ManagedComponent {

    private final LocalEventQueue eventQueue;
    private boolean running = false;

    // Fichier cible : les logs d'authentification Linux (SSH, su, sudo)
    private final String targetLogFile = "/var/log/auth.log";
    //private final String targetLogFile = "C://Users//marwa//Documents//test.log.txt";
    private Thread tailThread;

    public LogCollector(LocalEventQueue eventQueue) {
        this.eventQueue = eventQueue;
    }

    @Override
    public String name() {
        return "LogCollector";
    }

    @Override
    public void start(AgentConfig config) {
        this.running = true;

        tailThread = new Thread(() -> {
            try {
                File file = new File(targetLogFile);
                if (!file.exists()) {
                    System.err.println("[LogCollector] File not found : " + targetLogFile);
                    return;
                }

                // Ouverture en mode "r" (lecture seule)
                RandomAccessFile reader = new RandomAccessFile(file, "r");

                // On se place directement à la fin du fichier pour ne lire que les NOUVEAUX logs
                long lastPointer = reader.length();

                while (running) {
                    long currentLength = file.length();

                    // Si le fichier a grossi, il y a de nouvelles lignes !
                    if (currentLength > lastPointer) {
                        reader.seek(lastPointer);
                        String line;

                        while ((line = reader.readLine()) != null) {
                            processLogLine(line); // On analyse la ligne
                        }
                        // On met à jour notre pointeur
                        lastPointer = reader.getFilePointer();
                    } else if (currentLength < lastPointer) {
                        // Cas particulier : le fichier a été vidé (log rotation)
                        lastPointer = 0;
                    }

                    // On attend 1 seconde avant de revérifier (pour ne pas brûler le CPU)
                    Thread.sleep(1000);
                }
                reader.close();
            } catch (InterruptedException e) {
                // Le Supervisor a demandé l'arrêt
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                System.err.println("[LogCollector] Error reading log file : " + e.getMessage());
            }
        });

        tailThread.start();
    }

    private void processLogLine(String line) {
        // Règle de détection simple : on cherche un mot de passe refusé
        if (line.contains("Failed password")) {
            // Création de l'alerte !
            eventQueue.offer(new RawEvent("linux.auth.log", "Brute Force Attempt detected: " + line));
        }
        else if (line.contains("Accepted password")) {
            // Optionnel : on peut aussi remonter les succès pour faire des stats
            eventQueue.offer(new RawEvent("linux.auth.log", "Successful Login: " + line));
        }
    }

    @Override
    public void stop() {
        this.running = false;
        if (tailThread != null) {
            tailThread.interrupt(); // Force l'arrêt du Thread endormi
        }
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    @Override
    public ComponentHealth health() {
        return new ComponentHealth(name(), running, running ? "Tailing " + targetLogFile : "Stopped");
    }
}
