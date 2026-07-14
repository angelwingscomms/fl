#!/usr/bin/env bash
# Deploy the FL WebSocket backend to Cloud Run.
# TODO: set these before running (or export them in your shell):
export PROJECT_ID="${PROJECT_ID:-}"          # your GCP project id
export REGION="${REGION:-us-central1}"        # Cloud Run region
export REPO="${REPO:-fl-ws}"                  # Artifact Registry repo name
export QDRANT_URL="${QDRANT_URL:-}"           # from ../ver/.dev.vars
export QDRANT_KEY="${QDRANT_KEY:-}"           # from ../ver/.dev.vars

set -euo pipefail
[ -z "$PROJECT_ID" ] && { echo "set PROJECT_ID"; exit 1; }
[ -z "$QDRANT_URL" ] && { echo "set QDRANT_URL"; exit 1; }
[ -z "$QDRANT_KEY" ] && { echo "set QDRANT_KEY"; exit 1; }

# create the artifact registry repo if missing
gcloud artifacts repositories describe "$REPO" --location="$REGION" \
  || gcloud artifacts repositories create "$REPO" --location="$REGION" --repository-format=docker

gcloud builds submit --config ws/cloudbuild.yaml \
  --substitutions="_REGION=$REGION,_REPO=$REPO,_QDRANT_URL=$QDRANT_URL,_QDRANT_KEY=$QDRANT_KEY" \
  ws/

echo "Deployed. Get the URL with: gcloud run services describe fl-ws --region=$REGION --format='value(status.url)'"
echo "Then set PUBLIC_WS_URL (wss://<url>) in the SvelteKit app's env."
