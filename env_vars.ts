import { CLUSTER_ENV_VARS, ClusterEnvVars } from "@phading/cluster/env_vars";

export interface EnvVars extends ClusterEnvVars {
  gcsVideoBucketName?: string;
  gcsVideoMountedLocalDir?: string;
  releaseServiceName?: string;
  builderAccount?: string;
  serviceAccount?: string;
  cpuLimit?: string;
  memoryLimit?: string;
}

export let ENV_VARS: EnvVars = CLUSTER_ENV_VARS;
