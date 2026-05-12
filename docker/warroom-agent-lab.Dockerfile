FROM eclipse-temurin:17-jre-jammy

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    iproute2 \
    procps \
    netcat-openbsd \
    openssh-server \
    openssh-client \
    sudo \
    cron \
    vim \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/warroom-agent

COPY agent/target/classes /opt/warroom-agent/classes
COPY agent/target/dependency /opt/warroom-agent/dependency

RUN mkdir -p \
    /var/log \
    /etc/ssh \
    /etc/cron.d \
    /var/spool/cron/crontabs \
    /root/.ssh \
    /home/deploy/.ssh \
    /tmp/warroom-lab \
    && touch /var/log/auth.log \
    && touch /var/log/syslog \
    && touch /var/log/kern.log \
    && touch /etc/crontab \
    && touch /etc/cron.allow \
    && touch /etc/cron.deny \
    && touch /etc/ssh/sshd_config \
    && touch /root/.ssh/authorized_keys \
    && touch /home/deploy/.ssh/authorized_keys \
    && chmod 600 /root/.ssh/authorized_keys \
    && chmod 600 /home/deploy/.ssh/authorized_keys

ENV WARROOM_SERVER_URL=http://host.docker.internal:8080
ENV WARROOM_ENROLLMENT_SECRET=warroom-jee-secret-2026

CMD ["java", "-cp", "/opt/warroom-agent/classes:/opt/warroom-agent/dependency/*", "com.warroom.agent.kernel.AgentApplication"]
