# DevSecOps Capstone Project — OWASP NodeGoat

A complete **DevSecOps CI/CD pipeline** for the OWASP NodeGoat application using Docker, GitHub Actions, security scanning, Docker Hub, AWS EC2, and OWASP ZAP.

The project demonstrates how I designed and implemented a practical DevSecOps pipeline that automatically performs code quality checks, testing, SAST, secret scanning, dependency scanning, Dockerfile linting, Docker image building, image vulnerability scanning, Docker Hub publishing, EC2 deployment, application health checking, and DAST.

---

# 📌 Project Overview

**Project Name:** DevSecOps Capstone Project  
**Application:** OWASP NodeGoat  
**Repository:** `devsecops-capstone-project`  
**Application Port:** `4000`  
**Cloud Platform:** AWS  
**Deployment Target:** EC2  
**Container Registry:** Docker Hub  
**CI/CD:** GitHub Actions

OWASP NodeGoat is an intentionally vulnerable Node.js application designed for learning application security concepts.

Instead of treating the application's known vulnerabilities as something to immediately fix, I used them to build a **DevSecOps pipeline that detects and reports security issues throughout the software delivery lifecycle**.

---

# 🎯 Project Goals

The main goals of this capstone were:

- Dockerize the NodeGoat application.
- Understand Dockerfile optimization.
- Use a multi-stage Docker build.
- Run the application as a non-root user.
- Create a production-style Docker Compose setup.
- Configure MongoDB networking.
- Use Docker health checks.
- Use environment variables instead of hardcoding deployment configuration.
- Build a reusable GitHub Actions CI/CD pipeline.
- Run multiple security checks automatically.
- Use GitHub Actions reusable workflows.
- Understand `workflow_call`.
- Use `needs` to control job dependencies.
- Use parallel execution where possible.
- Use workflow inputs and outputs.
- Pass values between jobs and reusable workflows.
- Store Docker images as GitHub Actions artifacts.
- Scan the exact image that will be published.
- Push images to Docker Hub.
- Deploy the exact image version to AWS EC2.
- Perform an application health check after deployment.
- Perform OWASP ZAP DAST after deployment.
- Understand the difference between CI, security scanning, deployment, and runtime testing.
- Build an interview-ready DevSecOps project.

---

# 🏗️ Architecture

```text
                           GitHub Repository
                                  │
                         Push / Pull Request
                                  │
                                  ▼
                       ┌────────────────────┐
                       │   Main Pipeline    │
                       │     main.yml       │
                       └─────────┬──────────┘
                                 │
                              Lint
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
              Test              SAST         Secret Scan
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
        Dependency Scan   Dockerfile Lint
                │                │
                └────────────────┼────────────────┘
                                 │
                                 ▼
                         Docker Build
                                 │
                                 ▼
                         Docker Image
                                 │
                                 ▼
                         Trivy Scan
                                 │
                                 ▼
                         Docker Hub
                                 │
                                 ▼
                            AWS EC2
                                 │
                         Docker Compose
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                  NodeGoat                 MongoDB
                    │
                    ▼
              Health Check
                    │
                    ▼
                OWASP ZAP
                  DAST
```

---

# 🔄 CI/CD Pipeline Flow

The final pipeline uses the following dependency structure:

```text
lint
 │
 ├──────────────┬──────────────┬──────────────┬─────────────────┐
 ▼              ▼              ▼              ▼                 │
test           SAST       secret-scan   dependency-scan   dockerfile-lint
 │              │              │              │                 │
 │              └──────────────┴──────────────┴─────────────────┘
 │                                     │
 │                                     ▼
 │                              docker-build
 │                                     │
 │                                     ▼
 │                                image-scan
 │                                     │
 │                                     ▼
 │                                docker-push
 │                                     │
 │                                     ▼
 │                                deploy-ec2
 │                                     │
 │                                     ▼
 │                                health-check
 │                                     │
 │                                     ▼
 │                                  ZAP DAST
```

The security checks after linting are intentionally allowed to run in parallel.

This reduced the pipeline execution time compared with a completely sequential design.

One observed pipeline execution completed in approximately **6 minutes 29 seconds** after parallelization.

---

# 🧰 Technology Stack

## Application

- Node.js
- Express
- MongoDB
- OWASP NodeGoat

## Containers

- Docker
- Docker Compose
- Docker Hub

## CI/CD

- GitHub Actions
- Reusable workflows
- `workflow_call`

## Security

- JSHint
- Semgrep
- Gitleaks
- npm audit
- Hadolint
- Trivy
- OWASP ZAP

## Cloud

- AWS EC2

## Operating System

- Ubuntu 26.04 LTS on EC2

---

# 📁 Repository Structure

```text
devsecops-capstone-project/
│
├── app/
├── artifacts/
├── config/
├── test/
│
├── .github/
│   └── workflows/
│       ├── main.yml
│       ├── lint.yml
│       ├── test.yml
│       ├── sast.yml
│       ├── secret-scan.yml
│       ├── dependency-scan.yml
│       ├── dockerfile-lint.yml
│       ├── docker-build.yml
│       ├── image-scan.yml
│       ├── docker-push.yml
│       ├── deploy-ec2.yml
│       ├── health-check.yml
│       └── zap-dast.yml
│
├── Dockerfile
├── .dockerignore
├── docker-compose.yml
├── package.json
├── server.js
├── cypress.json
├── Gruntfile.js
├── Procfile
└── README.md
```

---

# 🐳 Docker Implementation

## Dockerfile

The final Dockerfile uses a **multi-stage build**.

```dockerfile
FROM node:20-alpine

ENV WORKDIR=/usr/src/app/

WORKDIR $WORKDIR

COPY package*.json $WORKDIR

RUN npm install --production --no-cache


FROM node:20-alpine

ENV USER=node
ENV WORKDIR=/home/$USER/app

WORKDIR $WORKDIR

COPY --from=0 /usr/src/app/node_modules node_modules

RUN chown $USER:$USER $WORKDIR

COPY --chown=node . $WORKDIR

# In production environment uncomment the next line
#RUN chown -R $USER:$USER /home/$USER && chmod -R g-s,o-rx /home/$USER && chmod -R o-wrx $WORKDIR

# Then all further actions including running the containers should be done under non-root user.
USER $USER

EXPOSE 4000

CMD ["node", "server.js"]
```

---

# 🔍 Why Multi-Stage Docker Build?

The Dockerfile uses two stages.

## Stage 1

The first stage:

- Uses Node.js 20 Alpine.
- Copies `package.json` and `package-lock.json`.
- Installs production dependencies.

```dockerfile
FROM node:20-alpine

COPY package*.json .

RUN npm install --production --no-cache
```

## Stage 2

The second stage:

- Starts from a clean Node.js Alpine image.
- Copies only the required `node_modules`.
- Copies the application.
- Changes ownership.
- Runs the application as the `node` user.

```dockerfile
FROM node:20-alpine

COPY --from=0 /usr/src/app/node_modules node_modules

COPY --chown=node . .

USER node
```

### Why use it?

Multi-stage builds help separate the dependency-building environment from the final runtime environment.

This avoids unnecessarily carrying build-stage content into the final runtime image.

---

# 👤 Running Container as Non-Root

The Dockerfile uses:

```dockerfile
ENV USER=node
```

and:

```dockerfile
USER $USER
```

Therefore the NodeGoat application does not run as Docker's default root user.

This is a security improvement because running applications as root increases the impact of a potential container compromise.

---

# 📦 `.dockerignore`

The project uses:

```dockerignore
node_modules
Dockerfile
docker-compose.yml
.dockerignore
.git
.github
.gitignore
```

The purpose is to prevent unnecessary files from being sent to the Docker build context.

This reduces unnecessary data being transferred to the Docker daemon and prevents development-only files and Git metadata from being copied into the image.

---

# 📊 Docker Image Optimization

I tested the image before and after optimization.

Observed image measurements included:

```text
Before .dockerignore:
Disk usage:    ~408 MB
Content size:  ~61.7 MB

After .dockerignore:
Disk usage:    ~181 MB
Content size:  ~36 MB
```

The exact displayed disk usage can vary because Docker's disk usage includes layers and local storage.

The important improvement was reducing unnecessary build context and keeping the runtime image cleaner.

---

# 🧪 Manual Docker Revision

Before implementing the final CI/CD pipeline, I manually revised Docker fundamentals.

## Build Image

```bash
docker build -t nodegoat-revision:v1 .
```

## Check Images

```bash
docker images
```

## Run Container

```bash
docker run -d \
  --name nodegoat-container \
  -p 4000:4000 \
  nodegoat-revision:v1
```

---

# 🛠️ Docker Troubleshooting

Initially, the container exited immediately.

I checked:

```bash
docker ps -a
```

Then:

```bash
docker logs nodegoat-container
```

I also inspected the container:

```bash
docker inspect nodegoat-container
```

The inspection showed that the container did not have the expected application command.

The Dockerfile was updated with:

```dockerfile
CMD ["node", "server.js"]
```

---

# 🗄️ MongoDB Connection Problem

After adding the `CMD`, the application exited because MongoDB was not available.

The logs showed:

```text
mongodb://localhost:27017/nodegoat
```

and the application received a connection refusal.

The reason was that `localhost` inside the NodeGoat container means:

```text
NodeGoat container itself
```

It does not mean another MongoDB container.

---

# 🌐 Docker Networking

I created a custom Docker network:

```bash
docker network create nodegoat-network
```

MongoDB was started on that network:

```bash
docker run -d \
  --name nodegoat-mongo \
  --network nodegoat-network \
  mongo:4.4
```

The NodeGoat application was then started with:

```bash
docker run -d \
  --name nodegoat-container \
  --network nodegoat-network \
  -p 4000:4000 \
  -e MONGODB_URI=mongodb://nodegoat-mongo:27017/nodegoat \
  nodegoat-revision:v1
```

The important concept learned here is:

```text
Container → Container communication
        ↓
Use Docker network + service/container name
```

instead of:

```text
localhost
```

---

# 🐳 Docker Compose

After manually understanding Docker networking, I implemented Docker Compose.

The final Compose configuration is:

```yaml
services:

  web:
    image: ${DOCKER_USERNAME}/nodegoat:${IMAGE_TAG}

    ports:
      - "4000:4000"

    environment:
      MONGODB_URI: mongodb://mongo:27017/nodegoat

    depends_on:
      mongo:
        condition: service_healthy

    command: sh -c "node artifacts/db-reset.js && npm start"

    restart: unless-stopped

    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:4000"]
      interval: 30s
      timeout: 10s
      retries: 3

    networks:
      - nodegoat-compose-network


  mongo:
    image: mongo:4.4

    user: mongodb

    volumes:
      - mongo_data:/data/db

    healthcheck:
      test: ["CMD", "mongo", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

    networks:
      - nodegoat-compose-network


volumes:
  mongo_data:


networks:
  nodegoat-compose-network:
    driver: bridge
```

---

# 🔗 Compose Networking

The services communicate using the Compose service name:

```text
web → mongo
```

The application uses:

```text
mongodb://mongo:27017/nodegoat
```

Here:

```text
mongo
```

is the Compose service name.

Docker's internal DNS resolves the service name to the MongoDB container.

---

# ❤️ Health Checks

Both services use health checks.

## NodeGoat

```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "-q", "http://localhost:4000"]
  interval: 30s
  timeout: 10s
  retries: 3
```

This checks whether the application is responding on port `4000`.

## MongoDB

The MongoDB container uses:

```yaml
healthcheck:
  test: ["CMD", "mongo", "--eval", "db.adminCommand('ping')"]
  interval: 10s
  timeout: 5s
  retries: 5
```

During troubleshooting, I discovered that MongoDB 4.4 provides the `mongo` shell rather than `mongosh`.

I verified it with:

```bash
command -v mongosh || command -v mongo
```

which returned:

```text
/usr/bin/mongo
```

Therefore the health check was changed to use:

```bash
mongo --eval "db.adminCommand('ping')"
```

---

# ⏳ `depends_on`

The web service uses:

```yaml
depends_on:
  mongo:
    condition: service_healthy
```

This means the application waits for MongoDB to become healthy before the web service starts.

This is better than simply starting both containers simultaneously.

---

# 💾 Persistent MongoDB Volume

The Compose configuration uses:

```yaml
volumes:
  mongo_data:
```

and:

```yaml
volumes:
  - mongo_data:/data/db
```

This keeps MongoDB data outside the container's writable layer.

The volume can therefore survive container recreation.

---

# 🔄 Restart Policy

The web application uses:

```yaml
restart: unless-stopped
```

This allows Docker to restart the container automatically after failures while still allowing an intentional manual stop.

---

# 🌐 Custom Compose Network

The project uses:

```yaml
networks:
  nodegoat-compose-network:
    driver: bridge
```

Both services join this network.

```text
nodegoat-compose-network
        │
        ├── web
        │
        └── mongo
```

---

# 🔐 Environment Variables

The Docker Compose file does not hardcode the Docker Hub username or image tag.

It uses:

```yaml
image: ${DOCKER_USERNAME}/nodegoat:${IMAGE_TAG}
```

These values are provided through `.env`.

Example:

```env
DOCKER_USERNAME=aniruddhakharve
IMAGE_TAG=<Git SHA>
```

The `.env` file is ignored by Git.

This allows the same Compose file to work with different image versions.

---

# 🚀 Docker Compose Commands

Start the application:

```bash
docker compose up -d
```

Build and start:

```bash
docker compose up -d --build
```

Check services:

```bash
docker compose ps
```

Stop services:

```bash
docker compose down
```

View logs:

```bash
docker compose logs
```

View service logs:

```bash
docker compose logs web
```

```bash
docker compose logs mongo
```

---

# 🔐 DevSecOps Pipeline

The pipeline is split into reusable GitHub Actions workflows.

Each workflow has one logical responsibility.

```text
main.yml
│
├── lint.yml
├── test.yml
├── sast.yml
├── secret-scan.yml
├── dependency-scan.yml
├── dockerfile-lint.yml
├── docker-build.yml
├── image-scan.yml
├── docker-push.yml
├── deploy-ec2.yml
├── health-check.yml
└── zap-dast.yml
```

---

# ♻️ Reusable Workflows

Each workflow uses:

```yaml
on:
  workflow_call:
```

This makes the workflow reusable by another workflow.

The main pipeline calls these workflows.

For example:

```yaml
jobs:
  lint:
    uses: ./.github/workflows/lint.yml
```

Instead of placing every step inside one huge workflow, the pipeline is separated into smaller reusable workflows.

---

# 🎛️ Main Pipeline

The main pipeline is:

```yaml
name: Main Pipeline

on:
  push:
    branches:
      - master

  pull_request:
    branches:
      - master

  workflow_dispatch:

jobs:

  lint:
    uses: ./.github/workflows/lint.yml

  test:
    needs: lint
    uses: ./.github/workflows/test.yml

  sast:
    needs: [lint]
    uses: ./.github/workflows/sast.yml

  secret-scan:
    needs: [lint]
    uses: ./.github/workflows/secret-scan.yml

  dependency-scan:
    needs: [lint]
    uses: ./.github/workflows/dependency-scan.yml

  dockerfile-lint:
    needs: [lint]
    uses: ./.github/workflows/dockerfile-lint.yml

  docker-build:
    needs: [sast, secret-scan, dependency-scan, dockerfile-lint]
    uses: ./.github/workflows/docker-build.yml

  image-scan:
    needs: docker-build
    uses: ./.github/workflows/image-scan.yml
    with:
      build-run-id: ${{ github.run_id }}

  docker-push:
    needs: [docker-build, image-scan]
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    uses: ./.github/workflows/docker-push.yml
    with:
      build-run-id: ${{ github.run_id }}
      image-tag: ${{ needs.docker-build.outputs.image-tag }}
    secrets: inherit

  deploy-ec2:
    needs: [docker-build, docker-push]
    if: github.event_name == 'push' && github.ref == 'refs/heads/master'
    uses: ./.github/workflows/deploy-ec2.yml
    with:
      image-tag: ${{ needs.docker-build.outputs.image-tag }}
    secrets: inherit

  health-check:
    needs: [deploy-ec2]
    uses: ./.github/workflows/health-check.yml
    secrets: inherit

  zap-dast:
    needs: [health-check]
    uses: ./.github/workflows/zap-dast.yml
    secrets: inherit
```

---

# 🔀 Pipeline Parallelization

Initially, the pipeline was more sequential.

The final design allows the security jobs to run in parallel after linting.

```text
                 Lint
                  │
       ┌──────────┼──────────┬──────────┐
       ▼          ▼          ▼          ▼
      SAST      Secrets     npm       Hadolint
                  │          │
       └──────────┴──────────┴──────────┘
                         │
                         ▼
                    Docker Build
```

This is implemented using:

```yaml
needs: [lint]
```

for the independent jobs.

They do not need to wait for each other.

---

# ⛓️ `needs`

`needs` defines job dependencies.

Example:

```yaml
test:
  needs: lint
```

This means:

```text
lint → test
```

For multiple dependencies:

```yaml
docker-build:
  needs: [sast, secret-scan, dependency-scan, dockerfile-lint]
```

Docker build starts only after those security checks finish successfully.

---

# 🧪 Linting

Workflow:

```text
lint.yml
```

Tool:

```text
JSHint
```

The workflow tests Node.js versions:

```yaml
strategy:
  matrix:
    node-version: [20, 22]
```

This demonstrates GitHub Actions matrix builds.

The workflow:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ matrix.node-version }}
```

Dependencies are installed with:

```bash
npm ci
```

Then:

```bash
npx --no-install jshint@2.12.0 .
```

Both Node.js 20 and Node.js 22 passed the linting workflow.

---

# 🧪 Testing

Workflow:

```text
test.yml
```

The pipeline runs:

```bash
npm ci
npm test
```

The existing NodeGoat test setup passes.

However, this should not be described as comprehensive modern unit-test coverage.

The purpose of this stage is to verify that the application's existing test command succeeds before proceeding with the delivery pipeline.

---

# 🔎 SAST

Workflow:

```text
sast.yml
```

Tool:

```text
Semgrep
```

Semgrep is used for Static Application Security Testing.

The workflow installs Semgrep:

```bash
python3 -m pip install semgrep
```

Then runs:

```bash
semgrep scan \
  --config=auto \
  --json \
  --output=semgrep-report.json
```

The report is uploaded as an artifact.

---

# 📊 Semgrep Findings

The NodeGoat application intentionally contains insecure code.

One scan produced:

```text
WARNING: 25
ERROR:    7
INFO:     1
```

Examples of findings included:

- Dangerous `eval()` usage.
- Private key material in repository content.
- bcrypt-related hardcoded hashes.
- Open redirect related findings.
- Security issues involving application logic.
- Security-related configuration concerns.

These findings demonstrate why security scanning is useful even before deployment.

---

# 🔑 Secret Scanning

Workflow:

```text
secret-scan.yml
```

Tool:

```text
Gitleaks
```

The workflow uses:

```yaml
fetch-depth: 0
```

This is important because Gitleaks should inspect the complete Git history rather than only the latest commit.

The workflow:

```yaml
- name: checkout code
  uses: actions/checkout@v7
  with:
    fetch-depth: 0

- name: Run Gitleaks
  uses: gitleaks/gitleaks-action@v2
```

---

# 🚨 Secret Leak Troubleshooting

Gitleaks initially detected secrets in the repository.

The detected content included:

- A private key file.
- Hardcoded ZAP API key values.

The application configuration was changed from a hardcoded value to:

```javascript
process.env.ZAP_API_KEY || ""
```

The private key file was removed from the repository.

The relevant cleanup was committed.

Important lesson:

```text
Removing a secret from the current file
does NOT automatically remove it from Git history.
```

If a real production credential has been exposed, it should also be rotated or revoked.

The final full-history Gitleaks workflow passed.

---

# 📦 Dependency Scanning

Workflow:

```text
dependency-scan.yml
```

Tool:

```text
npm audit
```

The workflow runs:

```bash
npm ci
```

and:

```bash
npm audit --json > npm-audit-report.json || true
```

The report is uploaded as an artifact.

---

# ⚠️ Why `npm audit` Does Not Fail the Pipeline

NodeGoat is intentionally vulnerable and uses an old dependency tree.

The initial dependency scan reported approximately:

```text
145 vulnerabilities

8 low
33 moderate
66 high
38 critical
```

A production application would normally require remediation.

However, automatically applying:

```bash
npm audit fix --force
```

could introduce breaking dependency changes and potentially break the intentionally old application.

Therefore this capstone treats the dependency scan as:

```text
Report → Artifact → Review
```

rather than:

```text
Vulnerability → Automatically fail entire capstone
```

This distinction is important.

---

# 🐳 Dockerfile Linting

Workflow:

```text
dockerfile-lint.yml
```

Tool:

```text
Hadolint
```

The workflow uses:

```yaml
uses: hadolint/hadolint-action@v3.3.0
```

and scans:

```text
Dockerfile
```

This helps detect Dockerfile problems such as:

- Bad practices.
- Inefficient instructions.
- Shell issues.
- Layering problems.
- Security-related Dockerfile concerns.

The final Dockerfile lint workflow passed.

---

# 🏗️ Docker Build

Workflow:

```text
docker-build.yml
```

The image is built with:

```bash
docker build -t nodegoat:ci .
```

The important part is that the image is built **once**.

It is then saved:

```bash
docker save nodegoat:ci -o nodegoat.tar
```

and uploaded as a GitHub Actions artifact.

---

# 📦 Why Use a Docker Artifact?

The Docker image is built once and stored as:

```text
nodegoat.tar
```

The image can then be downloaded by later workflows.

This allows:

```text
Build
  ↓
Scan
  ↓
Push
```

to operate on the same built image.

This avoids rebuilding the application separately for scanning and publishing.

---

# 🏷️ Docker Image Tagging

The pipeline generates the Docker image tag using:

```yaml
echo "image-tag=${{ github.sha }}" >> "$GITHUB_OUTPUT"
```

Therefore the image is identified using the Git commit SHA.

Example:

```text
aniruddhakharve/nodegoat:264585bdbe28d49f4ffbc8ac27a86bb7e70f7c8a
```

This gives every deployment a traceable image version.

---

# 🆔 `id`

The Docker build workflow uses:

```yaml
id: meta
```

Example:

```yaml
- name: Set image tag
  id: meta
  run: echo "image-tag=${{ github.sha }}" >> "$GITHUB_OUTPUT"
```

The `id` allows later steps to reference that step's outputs.

---

# 📤 `$GITHUB_OUTPUT`

The workflow writes:

```bash
echo "image-tag=${{ github.sha }}" >> "$GITHUB_OUTPUT"
```

This creates a step output.

The output chain is:

```text
Step Output
    ↓
Job Output
    ↓
Reusable Workflow Output
    ↓
Main Pipeline
    ↓
Docker Push
    ↓
EC2 Deployment
```

---

# 🔗 Job Outputs

The Docker build job exposes:

```yaml
outputs:
  image-tag: ${{ steps.meta.outputs.image-tag }}
```

The reusable workflow exposes:

```yaml
on:
  workflow_call:
    outputs:
      image-tag:
        description: "Docker image tag"
        value: ${{ jobs.docker-build.outputs.image-tag }}
```

The main pipeline can then access:

```yaml
${{ needs.docker-build.outputs.image-tag }}
```

This is how the same image tag moves through different reusable workflows.

---

# 🔍 Image Vulnerability Scanning

Workflow:

```text
image-scan.yml
```

Tool:

```text
Trivy
```

The workflow downloads the Docker image artifact:

```yaml
uses: actions/download-artifact@v4
```

Then loads the image:

```bash
docker load -i nodegoat.tar
```

The image is scanned:

```yaml
uses: aquasecurity/trivy-action@v0.36.0
with:
  image-ref: nodegoat:ci
  format: table
  severity: CRITICAL,HIGH
  exit-code: 0
```

---

# 🛡️ Trivy Report

A JSON report is also generated:

```bash
trivy image \
  --format json \
  --output trivy-report.json \
  --severity CRITICAL,HIGH \
  nodegoat:ci || true
```

The report is uploaded as:

```text
trivy-report
```

The scan detects vulnerabilities in:

- Alpine Linux packages.
- Node.js dependencies.
- Application dependencies.

Because NodeGoat is intentionally vulnerable, this scan is currently report-only.

---

# 📤 Docker Hub

Workflow:

```text
docker-push.yml
```

The workflow:

1. Downloads the Docker image artifact.
2. Loads the image.
3. Logs into Docker Hub.
4. Tags the image.
5. Pushes the SHA-tagged image.
6. Pushes `latest`.

Login:

```yaml
uses: docker/login-action@v3
```

Credentials come from GitHub Secrets:

```text
DOCKER_USERNAME
DOCKER_PASSWORD
```

---

# 🏷️ Docker Hub Tags

Two tags are pushed:

```text
<username>/nodegoat:<Git SHA>
```

and:

```text
<username>/nodegoat:latest
```

For example:

```text
aniruddhakharve/nodegoat:<SHA>
aniruddhakharve/nodegoat:latest
```

The SHA tag is especially important for deployment because it uniquely identifies the version.

`latest` is convenient for general consumption but should not be used as the only production deployment identifier.

---

# 🔐 GitHub Secrets

The pipeline uses GitHub Secrets for sensitive values.

Examples include:

```text
DOCKER_USERNAME
DOCKER_PASSWORD
EC2_HOST
EC2_USERNAME
EC2_SSH_KEY
```

These are not hardcoded into the workflow files.

---

# 🔄 `secrets: inherit`

The main workflow uses:

```yaml
secrets: inherit
```

when calling reusable workflows that require repository secrets.

Example:

```yaml
docker-push:
  uses: ./.github/workflows/docker-push.yml
  secrets: inherit
```

This allows the reusable workflow to access the required secrets without putting the secret values directly into the workflow code.

---

# ☁️ AWS EC2 Deployment

Workflow:

```text
deploy-ec2.yml
```

The deployment uses:

```text
appleboy/ssh-action
```

and:

```text
appleboy/scp-action
```

The pipeline connects to the EC2 instance using SSH.

---

# 🖥️ EC2 Environment

The deployment target used during the project was:

```text
Ubuntu 26.04 LTS
```

Docker and Docker Compose were installed/configured on the EC2 instance.

The deployment workflow checks whether Docker is installed.

If Docker is missing:

```bash
sudo apt update
sudo apt install -y docker.io
```

Docker Compose is also checked and installed if necessary.

---

# 🐳 Docker Permission Troubleshooting

Initially Docker commands without `sudo` failed because the EC2 user did not have permission to access the Docker daemon.

The workflow added the user to the Docker group:

```bash
sudo usermod -aG docker $USER
```

Then:

```bash
sudo newgrp docker
```

After this, Docker could be used without `sudo`.

I verified it with:

```bash
docker run hello-world
```

---

# 📂 EC2 Deployment Directory

The workflow creates:

```text
~/devops
```

The Compose file is copied to:

```text
~/devops/docker-compose.yml
```

The deployment also creates:

```text
~/devops/.env
```

---

# 🔐 EC2 `.env`

The deployment workflow generates:

```env
DOCKER_USERNAME=<Docker Hub username>
IMAGE_TAG=<Git SHA>
```

The file permissions are restricted:

```bash
chmod 600 ~/devops/.env
```

This allows Docker Compose to pull the exact image version.

---

# 📥 Pull Image

The EC2 deployment runs:

```bash
cd ~/devops
docker compose pull
```

Because the Compose file uses:

```yaml
image: ${DOCKER_USERNAME}/nodegoat:${IMAGE_TAG}
```

the exact SHA-tagged image is pulled.

---

# 🚀 Start Application

The existing deployment is stopped:

```bash
docker compose down || echo "No existing application to stop."
```

Then the new version is started:

```bash
docker compose up -d --force-recreate
```

This recreates the services using the new image configuration.

---

# 🔄 Deployment Flow

```text
Git Commit SHA
      │
      ▼
Docker Build
      │
      ▼
nodegoat:ci
      │
      ├──────────────► Trivy Scan
      │
      ▼
GitHub Artifact
      │
      ▼
Docker Hub
      │
      ▼
SHA Tagged Image
      │
      ▼
EC2
      │
      ▼
docker compose pull
      │
      ▼
docker compose up -d
```

---

# ❤️ Application Health Check

Workflow:

```text
health-check.yml
```

After EC2 deployment, the pipeline checks:

```text
http://<EC2_HOST>:4000/login
```

The command is:

```bash
curl -fsS http://${{ secrets.EC2_HOST }}:4000/login > /dev/null
```

The output is intentionally kept clean:

```text
Checking application health...
Application is healthy.
```

The `-f` option makes curl fail on HTTP errors.

The `-sS` options keep normal output quiet while still displaying errors.

---

# 🕷️ OWASP ZAP DAST

Workflow:

```text
zap-dast.yml
```

Tool:

```text
OWASP ZAP
```

ZAP performs Dynamic Application Security Testing.

Unlike SAST:

```text
SAST
 ↓
Source code
```

DAST tests the running application:

```text
Running application
 ↓
ZAP
 ↓
Security findings
```

---

# 🧪 ZAP Execution

The workflow uses:

```yaml
uses: zaproxy/action-baseline@v0.15.0
```

with:

```yaml
with:
  target: http://${{ secrets.EC2_HOST }}:4000
  allow_issue_writing: false
```

The scan runs against the deployed application.

---

# 🐢 Why Baseline Instead of Full ZAP Scan?

I initially tested the full ZAP scan.

The full scan took approximately:

```text
42+ minutes
```

and produced many findings.

The scan itself completed its security checks, but issue-writing behavior also caused workflow problems until:

```yaml
allow_issue_writing: false
```

was added.

For the capstone pipeline, I switched to the ZAP baseline scan because it is much more practical for CI/CD execution time.

The baseline scan completed in approximately:

```text
7 minutes
```

as part of the pipeline.

---

# 🔍 ZAP Findings

The scan identified issues such as:

- Missing security headers.
- Directory browsing.
- Vulnerable JavaScript libraries.
- Cross-domain JavaScript concerns.
- XSS-related findings.
- Other web security observations.

The purpose of this stage is to demonstrate:

```text
Deploy → Test the running application → Generate security findings
```

---

# ⚠️ Security Scanning Policy

This project uses an intentionally vulnerable application.

Therefore the current pipeline uses **report-only behavior** for several security scans.

Examples:

```text
Semgrep       → Report findings
Gitleaks      → Detect secrets
npm audit     → Report vulnerabilities
Trivy         → Report image vulnerabilities
ZAP           → Report DAST findings
```

This is different from saying:

```text
Security vulnerabilities are acceptable in production.
```

The actual lesson is:

```text
Detection policy depends on project stage and business requirements.
```

For a real production application, critical security findings could be configured to fail the pipeline.

---

# 🔀 Pull Request vs Push Behavior

The pipeline is triggered by:

```yaml
push:
  branches:
    - master

pull_request:
  branches:
    - master

workflow_dispatch:
```

---

# 🔎 Pull Request

For pull requests, the CI and security stages run.

The deployment-related stages are skipped because:

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/master'
```

is required for EC2 deployment.

This prevents a pull request from automatically deploying code to the EC2 environment.

---

# 🚀 Push to Master

A push to:

```text
master
```

runs the pipeline and allows:

```text
Docker Push
↓
EC2 Deployment
↓
Health Check
↓
ZAP DAST
```

---

# ▶️ Manual Workflow Run

The workflow also supports:

```yaml
workflow_dispatch:
```

This allows the pipeline to be manually started from GitHub Actions.

The current condition allows manual execution to perform the Docker push:

```yaml
if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
```

but EC2 deployment specifically requires:

```yaml
github.event_name == 'push'
```

and:

```yaml
github.ref == 'refs/heads/master'
```

---

# 🧠 GitHub Actions Concepts Used

| Concept | Where Used | Why |
|---|---|---|
| `workflow_call` | Reusable workflows | Reuse logical pipeline stages |
| `uses` | Main pipeline | Call reusable workflows |
| `needs` | Main pipeline | Define dependencies |
| Parallel jobs | Security stages | Reduce pipeline time |
| `if` | Push/deploy jobs | Control deployment conditions |
| `workflow_dispatch` | Main pipeline | Manual execution |
| `pull_request` | Main pipeline | CI/security validation |
| `push` | Main pipeline | Delivery pipeline |
| `secrets` | Docker/EC2 | Protect credentials |
| `secrets: inherit` | Reusable workflows | Pass repository secrets |
| `inputs` | Build/push/deploy | Pass configuration |
| `outputs` | Docker build | Pass image tag |
| `id` | Docker build | Reference step output |
| `$GITHUB_OUTPUT` | Docker build | Create step output |
| Artifacts | Docker/security reports | Share files between jobs |
| Matrix | Lint | Test Node.js versions |
| `always()` | Reports | Upload reports even after scan findings |
| Environment variables | Compose/deployment | Avoid hardcoded configuration |

---

# 📦 GitHub Actions Artifacts

Artifacts are used for:

```text
Docker image
Semgrep report
npm audit report
Trivy report
```

For example:

```yaml
uses: actions/upload-artifact@v4
```

The Docker image is uploaded:

```text
nodegoat.tar
```

Later workflows download it using:

```yaml
uses: actions/download-artifact@v4
```

---

# 🆔 Passing Data Between Workflows

The Docker image tag is generated from:

```text
github.sha
```

The value moves through the pipeline:

```text
github.sha
   ↓
Step output
   ↓
Job output
   ↓
Reusable workflow output
   ↓
needs.docker-build.outputs.image-tag
   ↓
Docker Push
   ↓
EC2 Deployment
```

This is one of the most important GitHub Actions concepts implemented in this project.

---

# 🧩 Why Reusable Workflows?

Instead of creating one huge workflow:

```text
main.yml
  └── 500+ lines
```

the project separates responsibilities:

```text
main.yml
   │
   ├── lint
   ├── test
   ├── SAST
   ├── secret scan
   ├── dependency scan
   ├── Dockerfile lint
   ├── Docker build
   ├── image scan
   ├── Docker push
   ├── deployment
   ├── health check
   └── DAST
```

Benefits:

- Easier to understand.
- Easier to troubleshoot.
- Each workflow has one responsibility.
- Reusable.
- Easier to maintain.
- Main pipeline remains readable.

---

# 🧰 Security Tool Selection

| Security Area | Tool | Purpose |
|---|---|---|
| Code Quality | JSHint | JavaScript linting |
| SAST | Semgrep | Static code security analysis |
| Secret Scan | Gitleaks | Detect secrets in Git history |
| Dependency Scan | npm audit | Dependency vulnerabilities |
| Dockerfile Scan | Hadolint | Dockerfile best practices |
| Image Scan | Trivy | Container vulnerabilities |
| DAST | OWASP ZAP | Running application security testing |

---

# 🧪 Troubleshooting Journey

This project was not created by simply writing all workflow files once.

Several issues were encountered and resolved during implementation.

---

## 1. Docker Container Exited Immediately

### Problem

The container started and then stopped.

### Investigation

```bash
docker ps -a
```

Then:

```bash
docker logs nodegoat-container
```

Then:

```bash
docker inspect nodegoat-container
```

### Root Cause

The expected Node.js command was missing.

### Fix

Added:

```dockerfile
CMD ["node", "server.js"]
```

---

# 2. MongoDB Connection Refused

### Problem

NodeGoat attempted:

```text
mongodb://localhost:27017/nodegoat
```

### Root Cause

Inside the NodeGoat container:

```text
localhost
```

refers to the NodeGoat container itself.

### Fix

Created a Docker network and used the MongoDB container name.

```text
mongodb://nodegoat-mongo:27017/nodegoat
```

Later, Compose used:

```text
mongodb://mongo:27017/nodegoat
```

---

# 3. MongoDB Health Check Failed

### Problem

The health check initially used:

```bash
mongosh
```

MongoDB 4.4 did not provide that command in the expected container environment.

### Investigation

```bash
command -v mongosh || command -v mongo
```

Result:

```text
/usr/bin/mongo
```

### Fix

Changed the health check to:

```bash
mongo --eval "db.adminCommand('ping')"
```

---

# 4. Docker Permission Error on EC2

### Problem

Docker required `sudo`.

### Root Cause

The EC2 user was not in the Docker group.

### Fix

```bash
sudo usermod -aG docker $USER
sudo newgrp docker
```

Then:

```bash
docker run hello-world
```

worked without `sudo`.

---

# 5. Gitleaks Did Not Initially Scan Full History

### Problem

The checkout was shallow.

### Fix

Changed:

```yaml
fetch-depth: 0
```

This ensures the complete Git history is available to Gitleaks.

---

# 6. Gitleaks Found Secrets

### Problem

Gitleaks detected secret-like content.

### Fixes

The ZAP API key configuration was changed to:

```javascript
process.env.ZAP_API_KEY || ""
```

The private key file was removed.

Important lesson:

```text
Never hardcode credentials or private keys into source control.
```

---

# 7. ZAP Tried to Write GitHub Issues

### Problem

The initial full ZAP workflow attempted issue-writing behavior and encountered:

```text
403 Resource not accessible by integration
```

### Fix

Added:

```yaml
allow_issue_writing: false
```

---

# 8. Full ZAP Scan Was Too Slow

### Problem

Full ZAP scanning took approximately:

```text
42+ minutes
```

### Fix

Changed to:

```yaml
uses: zaproxy/action-baseline@v0.15.0
```

This made the pipeline much more practical.

---

# 9. Pipeline Was Too Sequential

### Problem

Independent security jobs were waiting for one another.

### Fix

Used:

```yaml
needs: [lint]
```

for independent jobs.

This allowed:

```text
SAST
Secret Scan
Dependency Scan
Dockerfile Lint
Test
```

to execute concurrently where their dependencies allowed it.

The resulting pipeline completed faster.

---

# 📈 Pipeline Evolution

The pipeline evolved incrementally rather than being built all at once.

Important milestones included:

```text
Docker revision
      ↓
Docker Compose
      ↓
Dockerfile lint
      ↓
Dependency scanning
      ↓
Secret scanning
      ↓
SAST
      ↓
Docker build
      ↓
Image scanning
      ↓
Docker Hub
      ↓
EC2 deployment
      ↓
Health check
      ↓
ZAP DAST
      ↓
Parallelization
```

---

# 📝 Important Git Commits

Some important project milestones were:

```text
45428e6 Add reusable secret scan workflow

1d4db1c Add reusable dependency scan workflow

b04a026 Add reusable Dockerfile lint workflow

f93a3b7 Add reusable Docker build workflow

46e119f Add reusable image scan workflow

715e510 Make image scan report-only

a661a0c Connect Docker image tag to push workflow

264585bd Deploy exact Docker image tag

6161229 Add pipeline triggers and deployment conditions

d646f93 Integrate reusable ZAP DAST workflow

9c2eb74 Add reusable application health check

42751dd Scan full Git history with Gitleaks

f6b281b Clean up application health check output

6738477 Run security checks in parallel
```

These commits demonstrate the incremental development of the pipeline.

---

# 🧹 Useful Docker Commands

## Images

```bash
docker images
```

## Containers

```bash
docker ps
```

```bash
docker ps -a
```

## Logs

```bash
docker logs <container>
```

## Inspect

```bash
docker inspect <container>
```

## Networks

```bash
docker network ls
```

```bash
docker network inspect <network>
```

## Volumes

```bash
docker volume ls
```

## Build

```bash
docker build -t nodegoat:v1 .
```

## Run

```bash
docker run -d \
  --name nodegoat \
  -p 4000:4000 \
  nodegoat:v1
```

## Stop

```bash
docker stop nodegoat
```

## Remove

```bash
docker rm nodegoat
```

---

# 🐳 Useful Docker Compose Commands

```bash
docker compose up -d
```

```bash
docker compose up -d --build
```

```bash
docker compose ps
```

```bash
docker compose logs
```

```bash
docker compose logs web
```

```bash
docker compose logs mongo
```

```bash
docker compose down
```

---

# 🔐 Security Commands

## npm Audit

```bash
npm audit
```

JSON report:

```bash
npm audit --json
```

## Semgrep

```bash
semgrep scan --config=auto
```

## Gitleaks

```bash
gitleaks detect
```

## Trivy

```bash
trivy image nodegoat:ci
```

## Hadolint

```bash
hadolint Dockerfile
```

---

# 🧠 Docker Concepts Learned

The project reinforced the following Docker concepts:

```text
Dockerfile
Images
Containers
Layers
Docker build context
.dockerignore
Multi-stage builds
Non-root containers
Port mapping
Container networking
Bridge networks
Container DNS
Environment variables
Docker volumes
Docker Compose
depends_on
Health checks
Restart policies
Image tags
Docker Hub
docker save
docker load
```

---

# 🧠 GitHub Actions Concepts Learned

The project reinforced:

```text
Workflow
Job
Step
Runner
Actions
Reusable workflows
workflow_call
workflow_dispatch
push
pull_request
needs
if
env
secrets
secrets: inherit
inputs
outputs
id
GITHUB_OUTPUT
Artifacts
Matrix strategy
Job dependencies
Parallel execution
Conditional execution
```

---

# 🎯 Why Each GitHub Actions Concept Was Used

## `workflow_call`

Used to make individual pipeline stages reusable.

```yaml
on:
  workflow_call:
```

---

## `needs`

Used to control execution order.

```yaml
needs: docker-build
```

---

## Parallel Jobs

Used when jobs do not depend on one another.

Example:

```text
SAST
Secret Scan
Dependency Scan
Dockerfile Lint
```

can execute independently after linting.

---

## `if`

Used to prevent unwanted deployments.

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/master'
```

---

## `workflow_dispatch`

Used for manually starting the pipeline.

---

## `inputs`

Used to pass values such as:

```text
image-tag
build-run-id
```

into reusable workflows.

---

## `outputs`

Used to pass the generated image tag from Docker build to later jobs.

---

## `id`

Used to reference a step's output.

```yaml
id: meta
```

---

## `$GITHUB_OUTPUT`

Used to create a step output:

```bash
echo "image-tag=${{ github.sha }}" >> "$GITHUB_OUTPUT"
```

---

## Secrets

Used to protect:

```text
Docker credentials
EC2 SSH key
EC2 host
EC2 username
```

---

## Artifacts

Used to transfer:

```text
Docker image
Security reports
```

between jobs.

---

## Matrix

Used to run linting against:

```text
Node.js 20
Node.js 22
```

---

# 🎤 60-Second Interview Explanation

> "I built a DevSecOps capstone around the intentionally vulnerable OWASP NodeGoat application. First, I containerized the application using a multi-stage Dockerfile based on Node.js Alpine and configured it to run as a non-root user. I then created a Docker Compose setup with NodeGoat and MongoDB, including a custom network, persistent volume, health checks, restart policy, and depends_on health conditions.
>
> For CI/CD, I created reusable GitHub Actions workflows using workflow_call. The pipeline performs JSHint linting, testing, Semgrep SAST, Gitleaks secret scanning, npm dependency scanning, Hadolint Dockerfile linting, Docker image building, and Trivy image scanning. The security jobs run in parallel where possible to reduce execution time.
>
> The Docker image is built once, saved as an artifact, scanned, and then pushed to Docker Hub using a Git SHA tag and latest tag. The exact SHA-tagged image is deployed to an AWS EC2 instance using SSH and Docker Compose. After deployment, the pipeline performs an HTTP health check and then runs OWASP ZAP baseline DAST against the live application.
>
> Since NodeGoat is intentionally vulnerable, the security scans are currently configured mainly for reporting and learning rather than automatically blocking the entire pipeline."

---

# 🎤 Common Interview Questions

## 1. Why did you use reusable workflows?

Reusable workflows allowed me to separate the pipeline into logical stages.

Instead of putting everything into one large workflow, I created individual workflows for linting, testing, SAST, secret scanning, dependency scanning, Docker build, image scanning, deployment, and DAST.

---

## 2. What is `workflow_call`?

`workflow_call` allows one GitHub Actions workflow to be called by another workflow.

It is useful for creating reusable CI/CD components.

---

## 3. Why did you use `needs`?

`needs` defines dependencies between jobs.

For example:

```yaml
image-scan:
  needs: docker-build
```

means image scanning starts only after the Docker image has been built.

---

## 4. Why did you parallelize security scans?

The scans were independent after linting.

Instead of:

```text
SAST
 ↓
Gitleaks
 ↓
npm audit
 ↓
Hadolint
```

I used:

```text
       Lint
         │
    ┌────┼────┬────┐
    ▼    ▼    ▼    ▼
   SAST Gitleaks npm Hadolint
```

This reduces total pipeline execution time.

---

## 5. Why use Git SHA as the Docker tag?

A Git SHA uniquely identifies the source commit used to build the image.

For example:

```text
nodegoat:264585bd...
```

This provides traceability between:

```text
Git commit
     ↓
Docker image
     ↓
Docker Hub
     ↓
EC2 deployment
```

---

## 6. Why not deploy `latest`?

`latest` does not uniquely identify a version.

A SHA tag gives a deterministic deployment target.

For example:

```text
nodegoat:abc123
```

is directly tied to a specific Git commit.

---

## 7. Why did you save the Docker image as an artifact?

The image is built once and then reused by later jobs.

This means the image scanned by Trivy is the same image that is pushed to Docker Hub.

---

## 8. Why use `docker save`?

Docker images are local to the runner.

```bash
docker save nodegoat:ci -o nodegoat.tar
```

converts the image into a portable tar archive that can be uploaded as an artifact.

Another job can download it and use:

```bash
docker load -i nodegoat.tar
```

---

## 9. Why use Gitleaks with `fetch-depth: 0`?

Because a shallow checkout may not contain the complete Git history.

Using:

```yaml
fetch-depth: 0
```

allows Gitleaks to inspect the full repository history.

---

## 10. What is the difference between SAST and DAST?

### SAST

Tests source code without running the application.

```text
Source Code
    ↓
Semgrep
    ↓
Security Findings
```

### DAST

Tests the running application.

```text
Running Application
        ↓
       ZAP
        ↓
Security Findings
```

---

## 11. Why use both Trivy and npm audit?

They scan different layers.

```text
npm audit
    ↓
Node.js dependency vulnerabilities
```

while:

```text
Trivy
    ↓
Container image
    ↓
OS packages + application dependencies
```

Using both provides broader coverage.

---

## 12. Why use Hadolint?

Hadolint analyzes the Dockerfile for bad practices and potential improvements.

It complements Trivy because Hadolint examines the Dockerfile itself while Trivy scans the resulting image.

---

## 13. Why use health checks?

A container being `running` does not necessarily mean the application is working.

A health check verifies actual service availability.

For NodeGoat:

```bash
wget --spider -q http://localhost:4000
```

---

## 14. Why use `depends_on` with `service_healthy`?

Starting MongoDB's container does not necessarily mean MongoDB is ready to accept connections.

Using:

```yaml
condition: service_healthy
```

makes the web service wait for MongoDB to become healthy.

---

## 15. Why use a Docker network?

The NodeGoat application and MongoDB need to communicate.

Docker's internal network allows the application to connect using:

```text
mongodb://mongo:27017/nodegoat
```

rather than relying on `localhost`.

---

## 16. Why use a volume for MongoDB?

Containers are replaceable.

A named volume provides persistent storage for MongoDB data.

```text
MongoDB container
      ↓
mongo_data volume
```

---

## 17. Why run the application as a non-root user?

Running as a non-root user reduces privileges inside the container and follows a container security best practice.

---

## 18. Why is the security pipeline report-only?

NodeGoat is intentionally vulnerable.

The purpose of the capstone is to demonstrate how security tools detect vulnerabilities.

In a real production pipeline, policy could be configured so that critical findings block deployment.

---

# 🧠 Quick Revision Cheat Sheet

## Docker

```bash
docker build -t nodegoat:v1 .
docker images
docker ps
docker ps -a
docker logs <container>
docker inspect <container>
docker network ls
docker network inspect <network>
docker volume ls
```

---

## Docker Compose

```bash
docker compose up -d
docker compose up -d --build
docker compose ps
docker compose logs
docker compose down
```

---

## Docker Networking

```text
localhost
   ↓
Same container

service/container name
   ↓
Another container on same Docker network
```

Example:

```text
mongodb://mongo:27017/nodegoat
```

---

## GitHub Actions

```text
workflow_call
    ↓
Reusable workflow

needs
    ↓
Job dependency

if
    ↓
Conditional execution

inputs
    ↓
Pass data into workflow

outputs
    ↓
Pass data out of workflow

id
    ↓
Identify step

GITHUB_OUTPUT
    ↓
Create step output

artifacts
    ↓
Share files between jobs

secrets
    ↓
Protect sensitive data

matrix
    ↓
Run same job with multiple configurations
```

---

# 🔐 Security Cheat Sheet

```text
JSHint
 ↓
Code quality

Semgrep
 ↓
SAST

Gitleaks
 ↓
Secrets

npm audit
 ↓
Dependencies

Hadolint
 ↓
Dockerfile

Trivy
 ↓
Container image

OWASP ZAP
 ↓
Running application / DAST
```

---

# 🚀 Deployment Cheat Sheet

```text
Git Push
   ↓
Lint
   ↓
Security Checks
   ↓
Docker Build
   ↓
Save Image Artifact
   ↓
Trivy
   ↓
Docker Hub
   ↓
EC2
   ↓
Docker Compose
   ↓
Health Check
   ↓
OWASP ZAP
```

---

# 🔍 Important DevSecOps Principle

Security should not be treated as a single final step.

This project demonstrates security throughout the pipeline:

```text
Code
 ↓
SAST
 ↓
Secrets
 ↓
Dependencies
 ↓
Dockerfile
 ↓
Container Image
 ↓
Deployment
 ↓
Running Application
```

This is the core DevSecOps approach demonstrated by the project.

---

# 📊 CI/CD Stage Summary

| Stage | Tool | Main Purpose |
|---|---|---|
| Lint | JSHint | Code quality |
| Test | npm test | Application test command |
| SAST | Semgrep | Static security analysis |
| Secret Scan | Gitleaks | Detect secrets |
| Dependency Scan | npm audit | Dependency vulnerabilities |
| Dockerfile Lint | Hadolint | Dockerfile quality |
| Build | Docker | Create container image |
| Image Scan | Trivy | Container vulnerabilities |
| Push | Docker Hub | Store image |
| Deploy | SSH + Docker Compose | Deploy to EC2 |
| Health Check | curl | Verify application |
| DAST | OWASP ZAP | Test live application |

---

# 🏭 Production Improvements

If this project were moved toward a production environment, I would consider:

## 1. Stronger vulnerability gates

Instead of:

```text
exit-code: 0
```

critical vulnerabilities could fail the pipeline.

---

## 2. Secret rotation

Any real credential accidentally committed should be:

```text
Detected
 ↓
Revoked/Rotated
 ↓
Removed from repository/history where appropriate
```

---

## 3. Container registry authentication

Use short-lived credentials or an appropriate identity-based authentication mechanism rather than long-lived passwords where possible.

---

## 4. Better Docker image optimization

Further improvements could include:

- Pinning base image versions/digests.
- Installing only required production dependencies.
- Reducing unnecessary packages.
- Using a smaller runtime image where compatible.

---

## 5. Better application testing

The existing NodeGoat test setup could be expanded with:

- Unit tests.
- Integration tests.
- API tests.
- End-to-end tests.
- Security regression tests.

---

## 6. HTTPS

The current capstone deployment exposes:

```text
HTTP :4000
```

A production deployment should normally place the application behind:

```text
HTTPS
```

using a reverse proxy or load balancer.

---

## 7. AWS Load Balancer

Instead of exposing the EC2 application directly, a production architecture could use:

```text
Internet
   ↓
Application Load Balancer
   ↓
EC2 / Containers
```

---

## 8. AWS Secrets Manager / Parameter Store

Sensitive runtime configuration could be stored in:

```text
AWS Secrets Manager
```

or:

```text
AWS Systems Manager Parameter Store
```

rather than relying on manually generated `.env` files.

---

## 9. Better deployment strategy

Production could use:

```text
Blue/Green Deployment
```

or:

```text
Rolling Deployment
```

to reduce downtime.

---

## 10. Container Orchestration

The project could later be migrated to:

```text
Amazon ECS
```

or:

```text
Amazon EKS
```

depending on operational requirements.

---

# 📚 What I Learned From This Project

This capstone connected several DevOps and security concepts together.

Instead of learning them independently:

```text
Docker
GitHub Actions
AWS
Linux
Networking
Security
```

I connected them into one delivery workflow:

```text
Developer
   ↓
Git
   ↓
GitHub Actions
   ↓
Security
   ↓
Docker
   ↓
Docker Hub
   ↓
AWS EC2
   ↓
Docker Compose
   ↓
Health Check
   ↓
DAST
```

The most important learning was understanding how individual DevOps tools work together as one pipeline.

---

# 🧑‍💻 Final Project Explanation

This project demonstrates a complete learning-oriented DevSecOps workflow around an intentionally vulnerable application.

The application is containerized using Docker, with MongoDB running as a separate Compose service. Docker networking allows the application to communicate with MongoDB using the service name. Health checks and `depends_on` ensure the services start in the correct state.

GitHub Actions is used as the CI/CD platform. The pipeline is divided into reusable workflows so each stage has a clear responsibility.

The pipeline starts with linting and testing. Security checks then perform SAST, secret scanning, dependency scanning, and Dockerfile analysis. These independent checks run in parallel to reduce execution time.

The Docker image is then built once and stored as a GitHub Actions artifact. Trivy scans the same image before it is pushed to Docker Hub. The image receives a Git SHA tag so the deployed version can be traced back to the exact source commit.

The deployment workflow connects to AWS EC2 using SSH, copies the Compose configuration, creates the environment file, pulls the exact Docker image tag, and recreates the application stack.

After deployment, the pipeline checks the application's `/login` endpoint. Once the health check succeeds, OWASP ZAP performs DAST against the running application.

Because NodeGoat is intentionally vulnerable, the security stages are primarily configured to generate reports and demonstrate vulnerability detection rather than automatically block the entire capstone pipeline.

---

# 🏁 Final Architecture Summary

```text
                         ┌──────────────────────┐
                         │      Developer       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                              Git Push / PR
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     GitHub Actions   │
                         └──────────┬───────────┘
                                    │
                                  Lint
                                    │
             ┌──────────────────────┼──────────────────────┐
             │          │           │          │            │
             ▼          ▼           ▼          ▼            ▼
           Test       SAST       Gitleaks   npm audit   Hadolint
             │          │           │          │            │
             └──────────┴───────────┴──────────┴────────────┘
                                    │
                                    ▼
                              Docker Build
                                    │
                                    ▼
                             GitHub Artifact
                                    │
                                    ▼
                               Trivy Scan
                                    │
                                    ▼
                              Docker Hub
                                    │
                                    ▼
                                AWS EC2
                                    │
                           Docker Compose
                                    │
                       ┌────────────┴────────────┐
                       │                         │
                       ▼                         ▼
                    NodeGoat                 MongoDB
                    :4000
                       │
                       ▼
                 Health Check
                       │
                       ▼
                   OWASP ZAP
                     DAST
```

---

# ⭐ Final Takeaway

The main objective of this capstone was not simply to deploy NodeGoat.

The objective was to understand the complete path:

```text
Source Code
    ↓
Code Quality
    ↓
Testing
    ↓
Static Security
    ↓
Secret Detection
    ↓
Dependency Security
    ↓
Dockerfile Security
    ↓
Docker Build
    ↓
Container Security
    ↓
Container Registry
    ↓
Cloud Deployment
    ↓
Application Health
    ↓
Dynamic Security Testing
```

This project brings together the Linux, Docker, Git, GitHub Actions, AWS, networking, and security concepts learned throughout the DevOps journey into one practical project.