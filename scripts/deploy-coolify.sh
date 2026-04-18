#!/bin/bash
set -e

COOLIFY_URL="${COOLIFY_URL:-}"
COOLIFY_TOKEN="${COOLIFY_TOKEN:-}"
COOLIFY_PROJECT_ID="${COOLIFY_PROJECT_ID:-}"
COOLIFY_ENV_ID="${COOLIFY_ENV_ID:-}"
APP_NAME="taskchecker"

if [ -z "$COOLIFY_URL" ] || [ -z "$COOLIFY_TOKEN" ]; then
  echo "COOLIFY_URL ve COOLIFY_TOKEN environment variable'larini ayarlayin"
  echo "Ornek: export COOLIFY_URL=https://coolify.yourdomain.com"
  echo "       export COOLIFY_TOKEN=1|your-api-token"
  exit 1
fi

echo "=== Coolify Deploy: $APP_NAME ==="

get_projects() {
  curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" \
    "$COOLIFY_URL/api/v1/projects" | jq '.'
}

get_environments() {
  local project_id="$1"
  curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" \
    "$COOLIFY_URL/api/v1/projects/$project_id/environments" | jq '.'
}

create_application() {
  local env_id="$1"
  local git_url="$2"
  local git_branch="$3"
  local compose_dir="$4"

  curl -s -X POST \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    "$COOLIFY_URL/api/v1/applications" \
    -d "{
      \"project_uuid\": \"$COOLIFY_PROJECT_ID\",
      \"environment_name\": \"production\",
      \"server_uuid\": \"$(get_server_uuid)\",
      \"git_repository\": \"$git_url\",
      \"git_branch\": \"$git_branch\",
      \"build_pack\": \"dockerfile\",
      \"dockerfile_location\": \"$compose_dir\",
      \"name\": \"$APP_NAME\",
      \"ports_exposes\": \"3000\",
      \"environment_variables\": [
        {\"key\": \"PASSWORD\", \"value\": \"${APP_PASSWORD:-admin123}\"},
        {\"key\": \"JWT_SECRET\", \"value\": \"${JWT_SECRET:-$(openssl rand -hex 32)}\"},
        {\"key\": \"DATABASE_URL\", \"value\": \"file:/app/data/taskchecker.db\"}
      ]
    }" | jq '.'
}

deploy_compose() {
  local env_id="$1"
  local compose_content
  compose_content=$(cat docker-compose.yml | base64)

  curl -s -X POST \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    "$COOLIFY_URL/api/v1/applications/docker-compose" \
    -d "{
      \"project_uuid\": \"$COOLIFY_PROJECT_ID\",
      \"environment_name\": \"production\",
      \"server_uuid\": \"$(get_server_uuid)\",
      \"name\": \"$APP_NAME\",
      \"docker_compose_raw\": \"$(cat docker-compose.yml | jq -Rs .)\",
      \"ports_exposes\": \"3000\"
    }" | jq '.'
}

get_server_uuid() {
  curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" \
    "$COOLIFY_URL/api/v1/servers" | jq -r '.[0].uuid'
}

case "${1:-deploy}" in
  projects)
    echo "Mevcut projeler:"
    get_projects
    ;;
  environments)
    echo "Ortamlar (project: ${2:-$COOLIFY_PROJECT_ID}):"
    get_environments "${2:-$COOLIFY_PROJECT_ID}"
    ;;
  deploy)
    echo "Docker compose deploy yapiliyor..."
    deploy_compose "${COOLIFY_ENV_ID}"
    echo ""
    echo "Deploy tamamlandi. Coolify panelinden uygulamayi baslatin."
    echo "URL: $COOLIFY_URL"
    ;;
  status)
    echo "Uygulama durumu:"
    curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" \
      "$COOLIFY_URL/api/v1/applications" | jq ".[] | select(.name==\"$APP_NAME\")"
    ;;
  *)
    echo "Kullanim: $0 {deploy|projects|environments|status}"
    echo ""
    echo "Environment Variables:"
    echo "  COOLIFY_URL       - Coolify instance URL (orn: https://coolify.domain.com)"
    echo "  COOLIFY_TOKEN      - Coolify API token"
    echo "  COOLIFY_PROJECT_ID - Coolify proje UUID"
    echo "  APP_PASSWORD       - Uygulama sifresi (varsayilan: admin123)"
    exit 1
    ;;
esac