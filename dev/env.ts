import "../env_const";
import "@phading/cluster/dev/env";
import { ENV_VARS } from "../env_vars";

ENV_VARS.gcsVideoBucketName = "phading-dev-video";
ENV_VARS.gcsVideoMountedLocalDir = "/gcs_video";
ENV_VARS.gcsVideoOutputBucketName = "phading-dev-video-output";
ENV_VARS.gcsVideoOutputMountedLocalDir = "/gcs_video_output";
ENV_VARS.cpuLimit = "2";
ENV_VARS.memoryLimit = "4Gi";
