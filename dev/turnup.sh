#!/bin/bash
# GCP auth
gcloud auth application-default login
gcloud config set project phading-dev

# Create build account
gcloud iam service-accounts create video-formatting-builder

# Grant permissions to the build account
gcloud projects add-iam-policy-binding phading-dev --member="serviceAccount:video-formatting-builder@phading-dev.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding phading-dev --member="serviceAccount:video-formatting-builder@phading-dev.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None

# Create service account
gcloud iam service-accounts create video-formatting-account

# Grant permissions to the service account
gcloud projects add-iam-policy-binding phading-dev --member="serviceAccount:video-formatting-account@phading-dev.iam.gserviceaccount.com" --role='roles/storage.objectUser' --condition=None
