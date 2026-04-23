package com.warroom.agent.collectors;

import com.warroom.agent.kernel.config.AgentConfig;
import com.warroom.agent.kernel.model.ComponentHealth;
import com.warroom.agent.kernel.supervisor.ManagedComponent;
import com.warroom.agent.transmission.LocalEventQueue;
import com.warroom.agent.transmission.model.RawEvent;

import java.io.File;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicBoolean;

public class SyscallCollector implements ManagedComponent {

    private final LocalEventQueue eventQueue;

    private final AtomicBoolean running = new AtomicBoolean(false);

    private Thread worker;

    // Configurable plus tard via AgentConfig
    private String auditLogPath = "/var/log/audit/audit.log";

    // Stats internes (utile pour monitoring)
    private long linesRead = 0;
    private long eventsSent = 0;
    private long errors = 0;

    public SyscallCollector(LocalEventQueue eventQueue) {
        this.eventQueue = eventQueue;
    }

    @Override
    public String name() {
        return "SyscallCollector";
    }

    @Override
    public void start(AgentConfig config) {

        if (running.get()) {
            return;
        }

        running.set(true);

        worker = new Thread(this::runCollector, "syscall-collector-thread");
        worker.setDaemon(true);
        worker.start();

        System.out.println("[SyscallCollector] Started.");
    }

    private void runCollector() {

        Path path = Path.of(auditLogPath);

        if (!Files.exists(path)) {
            System.err.println("[SyscallCollector] audit.log not found: " + auditLogPath);
            running.set(false);
            return;
        }

        try (RandomAccessFile reader = new RandomAccessFile(path.toFile(), "r")) {

            long pointer = reader.length(); // start at end (tail -f)

            while (running.get()) {

                try {

                    long fileLength = reader.length();

                    // 🔄 Log rotation détectée
                    if (fileLength < pointer) {
                        System.out.println("[SyscallCollector] Log rotation detected.");
                        pointer = 0;
                    }

                    // 📥 Nouvelles lignes
                    if (fileLength > pointer) {

                        reader.seek(pointer);

                        String line;
                        while ((line = reader.readLine()) != null) {

                            linesRead++;

                            // Filtrage MINIMAL (performance)
                            if (line.contains("type=SYSCALL")) {

                                boolean accepted = eventQueue.offer(
                                        new RawEvent("linux.auditd.syscall", line)
                                );

                                if (accepted) {
                                    eventsSent++;
                                }
                            }
                        }

                        pointer = reader.getFilePointer();
                    }

                    // ⏱️ Backoff intelligent
                    Thread.sleep(500);

                } catch (Exception e) {
                    errors++;
                    System.err.println("[SyscallCollector] Read error: " + e.getMessage());

                    // éviter crash → on continue
                    Thread.sleep(1000);
                }
            }

        } catch (Exception e) {
            errors++;
            System.err.println("[SyscallCollector] Fatal error: " + e.getMessage());
        }

        System.out.println("[SyscallCollector] Stopped.");
    }

    @Override
    public void stop() {
        running.set(false);

        if (worker != null) {
            worker.interrupt();
        }
    }

    @Override
    public boolean isRunning() {
        return running.get();
    }

    @Override
    public ComponentHealth health() {
        return new ComponentHealth(
                name(),
                running.get(),
                "lines=" + linesRead +
                        ", events=" + eventsSent +
                        ", errors=" + errors
        );
    }
}