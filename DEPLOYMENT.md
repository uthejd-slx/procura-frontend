# Procura Frontend Deployment

Release deployments run from GitHub Release events (not on push). The workflow builds a Docker image, pushes it to Docker Hub, and deploys it to the DigitalOcean droplet using `docker compose`.

## One-time server setup

1. SSH into the droplet and create the deploy directory:
   `sudo mkdir -p /home/ubuntu/procura_frontend`
2. Ensure the deploy user owns the directory:
   `sudo chown -R $USER:$USER /home/ubuntu/procura_frontend`
3. The workflow writes compose and env files on the server directly (no SCP step).
2. Ensure Docker + Docker Compose are installed.
3. Decide which port to expose:
   - Preferred: `80` if available.
   - Fallback: `8080` if port 80 is already in use.
4. Update `/home/ubuntu/procura_frontend/.env.prod`:
   - `FRONTEND_PORT=80` (preferred). The deploy script auto-falls back to `8080` if port 80 is busy.

If port 80 is in use, access the app at `http://<server-ip>:8080/`.

## GitHub Actions release deploy

Create a GitHub Release (tag) to trigger the workflow:
- Image tags: `${DOCKERHUB_USERNAME}/procura-frontend:${TAG}` and `latest`
- Deploy path: `/home/ubuntu/procura_frontend`
- Compose + env files are written by the deploy step (no upload staging).
- Health check: `curl --fail http://localhost:${FRONTEND_PORT}/`
- On success, the tag is written to `.last_deploy_tag`
- On failure, it rolls back to the previous tag if available

## API base URL (build-time)

The Angular build uses a build-time API base URL. Update it in the workflow and cut a new release:
- File: `.github/workflows/release-deploy.yml`
- Variable: `API_BASE_URL`
- Current value: `http://128.199.25.59:8001`

The value is injected at build time into `src/app/core/api-base-url.ts`.

## Secrets (GitHub Actions)

Required secrets:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `PROD_SERVER_IP`
- `PROD_SERVER_SSH_USER`
- `PROD_SERVER_SSH_KEY`
- `PROD_SERVER_SSH_PASSPHRASE` (only if key is encrypted)
- `PROD_SERVER_SSH_PORT`

## Manual deploy (optional)

If you need to deploy manually on the server:
1. Set the tags:
   - `export DOCKERHUB_USERNAME=...`
   - `export IMAGE_TAG=...`
2. Run:
   - `docker compose -f /home/ubuntu/procura_frontend/docker-compose.prod.yml pull web`
   - `docker compose -f /home/ubuntu/procura_frontend/docker-compose.prod.yml up -d web`
3. Check:
   - `curl --fail http://localhost:${FRONTEND_PORT}/`
