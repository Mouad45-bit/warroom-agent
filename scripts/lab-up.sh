#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# War Room SOC - Lab Docker niveau 2
# Crée une machine Docker avec un vrai agent Java,
# enrôle l'agent, active les collecteurs, puis redémarre.
# ============================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

SERVER_URL="${SERVER_URL:-http://localhost:8080}"
ENROLLMENT_SECRET="${ENROLLMENT_SECRET:-warroom-jee-secret-2026}"

ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"

IMAGE_NAME="${IMAGE_NAME:-warroom-agent-lab:dev}"
CONTAINER_NAME="${CONTAINER_NAME:-warroom-lab-01}"
LAB_HOSTNAME="${LAB_HOSTNAME:-lab-docker-01}"
DOCKERFILE="${DOCKERFILE:-docker/warroom-agent-lab.Dockerfile}"

COOKIE_FILE="/tmp/warroom-admin.cookies"
LOGIN_BODY="/tmp/warroom-login-body.txt"
CONFIG_BODY="/tmp/warroom-config-body.txt"

echo
echo "============================================================"
echo " WAR ROOM LAB - MACHINE DOCKER + AGENT"
echo "============================================================"
echo "[INFO] Projet       : $PROJECT_ROOT"
echo "[INFO] Backend      : $SERVER_URL"
echo "[INFO] Image Docker : $IMAGE_NAME"
echo "[INFO] Conteneur    : $CONTAINER_NAME"
echo "[INFO] Hostname     : $LAB_HOSTNAME"
echo

# ------------------------------------------------------------
# 0. Vérifications minimales
# ------------------------------------------------------------
command -v docker >/dev/null 2>&1 || { echo "[ERREUR] Docker introuvable."; exit 1; }
command -v mvn >/dev/null 2>&1 || { echo "[ERREUR] Maven introuvable."; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "[ERREUR] curl introuvable."; exit 1; }

if [ ! -f "$DOCKERFILE" ]; then
  echo "[ERREUR] Dockerfile introuvable : $DOCKERFILE"
  exit 1
fi

if [ ! -f "agent/pom.xml" ]; then
  echo "[ERREUR] agent/pom.xml introuvable. Lance le script depuis la racine du projet."
  exit 1
fi

# ------------------------------------------------------------
# 1. Vérifier que le backend répond via login admin
# ------------------------------------------------------------
echo "[1/8] Vérification backend + login admin..."

rm -f "$COOKIE_FILE" "$LOGIN_BODY"

LOGIN_STATUS="$(
  curl -sS -o "$LOGIN_BODY" -w "%{http_code}" \
    -c "$COOKIE_FILE" \
    -H "Content-Type: application/json" \
    -X POST "$SERVER_URL/api/auth/login" \
    -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" || true
)"

if [ "$LOGIN_STATUS" != "200" ]; then
  echo "[ERREUR] Login admin échoué. HTTP=$LOGIN_STATUS"
  echo "[INFO] Réponse backend :"
  cat "$LOGIN_BODY" || true
  echo
  echo "[AIDE] Vérifie que Warroom Server tourne sur $SERVER_URL et que admin/admin est correct."
  exit 1
fi

echo "[OK] Login admin réussi."

# ------------------------------------------------------------
# 2. Compiler l’agent
# ------------------------------------------------------------
echo
echo "[2/8] Compilation de l'agent Java..."

mvn -f agent/pom.xml clean package dependency:copy-dependencies \
  -DincludeScope=runtime \
  -DoutputDirectory=target/dependency

echo "[OK] Agent compilé."

# ------------------------------------------------------------
# 3. Build image Docker
# ------------------------------------------------------------
echo
echo "[3/8] Construction de l'image Docker..."

docker build \
  -f "$DOCKERFILE" \
  -t "$IMAGE_NAME" \
  .

echo "[OK] Image construite : $IMAGE_NAME"

# ------------------------------------------------------------
# 4. Supprimer ancien conteneur pour éviter identity.json périmé
# ------------------------------------------------------------
echo
echo "[4/8] Suppression ancien conteneur si présent..."

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "[OK] Ancien conteneur supprimé ou absent."

# ------------------------------------------------------------
# 5. Lancer machine Docker propre
# ------------------------------------------------------------
echo
echo "[5/8] Lancement de la machine Docker avec agent..."

docker run -d \
  --name "$CONTAINER_NAME" \
  --hostname "$LAB_HOSTNAME" \
  --add-host=host.docker.internal:host-gateway \
  -e WARROOM_SERVER_URL="http://host.docker.internal:8080" \
  -e WARROOM_ENROLLMENT_SECRET="$ENROLLMENT_SECRET" \
  "$IMAGE_NAME" >/dev/null

echo "[OK] Conteneur lancé."

# ------------------------------------------------------------
# 6. Attendre l'enrôlement agent
# ------------------------------------------------------------
echo
echo "[6/8] Attente de l'enrôlement de l'agent..."

AGENT_ID=""
API_KEY=""

for i in $(seq 1 60); do
  if docker exec "$CONTAINER_NAME" test -s /root/.warroom-agent/identity.json >/dev/null 2>&1; then
    AGENT_ID="$(
      docker exec "$CONTAINER_NAME" sh -c \
      "sed -n 's/.*\"agentId\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p' /root/.warroom-agent/identity.json"
    )"

    API_KEY="$(
      docker exec "$CONTAINER_NAME" sh -c \
      "sed -n 's/.*\"apiKey\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p' /root/.warroom-agent/identity.json"
    )"

    if [ -n "$AGENT_ID" ] && [ -n "$API_KEY" ]; then
      break
    fi
  fi

  echo "[WAIT] Enrôlement en cours... ${i}/60"
  sleep 1
done

if [ -z "$AGENT_ID" ] || [ -z "$API_KEY" ]; then
  echo "[ERREUR] Impossible de récupérer identity.json."
  echo "[INFO] Logs agent :"
  docker logs "$CONTAINER_NAME" || true
  exit 1
fi

echo "[OK] Agent enrôlé."
echo "[INFO] AGENT_ID=$AGENT_ID"

# ------------------------------------------------------------
# 7. Vérifier auth agent via /config
# ------------------------------------------------------------
echo
echo "[7/8] Vérification de l'authentification agent..."

AUTH_STATUS="$(
  curl -sS -o /tmp/warroom-agent-config-check.txt -w "%{http_code}" \
    "$SERVER_URL/api/agents/$AGENT_ID/config" \
    -H "Authorization: Bearer $API_KEY" || true
)"

if [ "$AUTH_STATUS" != "200" ]; then
  echo "[ERREUR] Auth agent échouée. HTTP=$AUTH_STATUS"
  cat /tmp/warroom-agent-config-check.txt || true
  echo
  echo "[INFO] Logs agent :"
  docker logs "$CONTAINER_NAME" || true
  exit 1
fi

echo "[OK] Auth agent valide."

# ------------------------------------------------------------
# 8. Activer les 4 collecteurs
# ------------------------------------------------------------
echo
echo "[8/8] Activation des collecteurs..."

CONFIG_STATUS="$(
  curl -sS -o "$CONFIG_BODY" -w "%{http_code}" \
    -b "$COOKIE_FILE" \
    -H "Content-Type: application/json" \
    -X PUT "$SERVER_URL/api/admin/agents/$AGENT_ID/config" \
    -d '{
      "heartbeatIntervalSeconds": 30,
      "batchSize": 100,
      "retryIntervalSeconds": 10,
      "enabledCollectors": [
        "LogCollector",
        "NetworkCollector",
        "FileIntegrityCollector"
      ]
    }' || true
)"

if [ "$CONFIG_STATUS" != "200" ] && [ "$CONFIG_STATUS" != "204" ]; then
  echo "[ERREUR] Configuration collecteurs échouée. HTTP=$CONFIG_STATUS"
  cat "$CONFIG_BODY" || true
  exit 1
fi

echo "[OK] Collecteurs activés."

# ------------------------------------------------------------
# 9. Redémarrer pour charger la config distante
# ------------------------------------------------------------
echo
echo "[INFO] Redémarrage du conteneur pour charger la config active..."

docker restart "$CONTAINER_NAME" >/dev/null

sleep 5

echo
echo "============================================================"
echo " LAB PRÊT"
echo "============================================================"
echo "[OK] Machine Docker : $CONTAINER_NAME"
echo "[OK] Hostname       : $LAB_HOSTNAME"
echo "[OK] Agent ID       : $AGENT_ID"
echo "[OK] Collecteurs    : Log, Network, Process, FileIntegrity"
echo
echo "Commandes utiles :"
echo
echo "  Voir les logs agent :"
echo "  docker logs -f $CONTAINER_NAME"
echo
echo "  Entrer dans la machine pour taper les attaques :"
echo "  docker exec -it $CONTAINER_NAME bash"
echo
echo "  Vérifier l'agent côté backend :"
echo "  curl -i \"$SERVER_URL/api/agents/$AGENT_ID/config\" -H \"Authorization: Bearer $API_KEY\""
echo
echo "============================================================"
