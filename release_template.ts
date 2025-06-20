import { ENV_VARS } from "./env_vars";
import { writeFileSync } from "fs";

function generate(env: string) {
  let turnupTemplate = `#!/bin/bash
# GCP auth
gcloud auth application-default login
gcloud config set project ${ENV_VARS.projectId}

# Create build account
gcloud iam service-accounts create ${ENV_VARS.builderAccount}

# Grant permissions to the build account
gcloud projects add-iam-policy-binding ${ENV_VARS.projectId} --member="serviceAccount:${ENV_VARS.builderAccount}@${ENV_VARS.projectId}.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding ${ENV_VARS.projectId} --member="serviceAccount:${ENV_VARS.builderAccount}@${ENV_VARS.projectId}.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None

# Create service account
gcloud iam service-accounts create ${ENV_VARS.serviceAccount}

# Grant permissions to the service account
gcloud projects add-iam-policy-binding ${ENV_VARS.projectId} --member="serviceAccount:${ENV_VARS.serviceAccount}@${ENV_VARS.projectId}.iam.gserviceaccount.com" --role='roles/storage.objectUser' --condition=None
`;
  writeFileSync(`${env}/turnup.sh`, turnupTemplate);

  let cloudbuildTemplate = `steps:
- name: 'node:20.12.1'
  entrypoint: 'npm'
  args: ['ci']
- name: node:20.12.1
  entrypoint: npx
  args: ['bundage', 'bfn', '${env}/main', 'main_bin', '-t', 'bin']
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/${ENV_VARS.projectId}/${ENV_VARS.releaseServiceName}:latest', '-f', '${env}/Dockerfile', '.']
- name: "gcr.io/cloud-builders/docker"
  args: ['push', 'gcr.io/${ENV_VARS.projectId}/${ENV_VARS.releaseServiceName}:latest']
- name: 'gcr.io/cloud-builders/gcloud'
  args: ['run', 'jobs', 'replace', '${env}/service.yaml']
options:
  logging: CLOUD_LOGGING_ONLY
`;
  writeFileSync(`${env}/cloudbuild.yaml`, cloudbuildTemplate);

  let dockerTemplate = `FROM node:20.12.1

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
COPY package-lock.json .
COPY bin/ .
RUN npm ci --omit=dev

EXPOSE 8080
CMD ["node", "main_bin"]
`;
  writeFileSync(`${env}/Dockerfile`, dockerTemplate);

  let serviceTemplate = `apiVersion: run.googleapis.com/v1
kind: Job
metadata:
  name: ${ENV_VARS.releaseServiceName}
  location: ${ENV_VARS.clusterRegion}
spec:
  template:
    spec:
      template:
        spec:
          containers:
          - name: ${ENV_VARS.releaseServiceName}-container
            image: gcr.io/your-project-id/${ENV_VARS.releaseServiceName}:latest
            resources:
              limits:
                cpu: ${ENV_VARS.cpuLimit}
                memory: ${ENV_VARS.memoryLimit}
            env:
            - name: gcs_media_filename
              value: ""
            - name: video_dir
              value: ""
            - name: audio_dirs
              value: ""
            volumeMounts:
            - name: gcs-volume
              mountPath: ${ENV_VARS.gcsVideoMountedLocalDir}
              readOnly: true # Input bucket typically read-only
          volumes: # Define the GCS volumes
          - name: gcs-volume
            gcs:
              bucket: ${ENV_VARS.gcsVideoBucketName}
          serviceAccountName: ${ENV_VARS.serviceAccount}@${ENV_VARS.projectId}.iam.gserviceaccount.com
          taskCount: 1
          maxRetries: 3
          timeoutSeconds: 3600 # e.g., 1 hour
`;
  writeFileSync(`${env}/service.yaml`, serviceTemplate);

  let mainTemplate = `import "./env";
import "../main";
`
  writeFileSync(`${env}/main.ts`, mainTemplate);
}

import "./dev/env";
generate("dev");
