import {
  AUDIO_DIRS_VAR,
  GCS_FILENAME_VAR,
  LOCAL_MASTER_PLAYLIST_NAME_VAR,
  LOCAL_PLAYLIST_NAME_VAR,
  VIDEO_DIR_OPTIONAL_VAR,
} from "./args";
import { Processor } from "./processor";
import { initS3Client } from "./s3_client";

async function main() {
  await initS3Client();
  let loggingPrefix = `Job ${Math.floor(Math.random() * 1000)}: `;
  try {
    await Processor.create().run(
      loggingPrefix,
      process.env[GCS_FILENAME_VAR],
      process.env[LOCAL_MASTER_PLAYLIST_NAME_VAR],
      process.env[LOCAL_PLAYLIST_NAME_VAR],
      process.env[VIDEO_DIR_OPTIONAL_VAR].split(","),
      process.env[AUDIO_DIRS_VAR].split(","),
    );
  } catch (e) {
    console.error(`${loggingPrefix}`, e);
    process.exit(1);
  }
}

main();
