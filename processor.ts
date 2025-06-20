import "./dev/env";
import { ENV_VARS } from "./env_vars";
import { spawnAsync } from "./spawn";
import { mkdir } from "fs/promises";

export class Processor {
  public static create(): Processor {
    return new Processor();
  }

  private static HLS_SEGMENT_TIME = 6; // sec

  public constructor() {}

  public async run(
    loggingPrefix: string,
    gcsFilename: string,
    localMasterPlaylistName: string,
    localPlaylistName: string,
    videoDirOptional: Array<string>,
    audioDirs: Array<string>,
  ): Promise<void> {
    console.log(`${loggingPrefix} Start HLS formatting.`);
    await Promise.all([
      ...videoDirOptional.map((videoDir) =>
        mkdir(`${ENV_VARS.gcsVideoOutputMountedLocalDir}/${videoDir}`, {
          recursive: true,
        }),
      ),
      ...audioDirs.map((audioDir) =>
        mkdir(`${ENV_VARS.gcsVideoOutputMountedLocalDir}/${audioDir}`, {
          recursive: true,
        }),
      ),
    ]);

    let formattingArgs: Array<string> = [
      "-i",
      `${ENV_VARS.gcsVideoMountedLocalDir}/${gcsFilename}`,
      "-loglevel",
      "error",
    ];
    videoDirOptional.forEach((videoDir) => {
      formattingArgs.push(
        "-map",
        "0:v:0",
        "-c:v",
        "copy",
        "-f",
        "hls",
        "-hls_time",
        `${Processor.HLS_SEGMENT_TIME}`,
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        `${ENV_VARS.gcsVideoOutputMountedLocalDir}/${videoDir}/%d.ts`,
        "-master_pl_name",
        `${localMasterPlaylistName}`,
        `${ENV_VARS.gcsVideoOutputMountedLocalDir}/${videoDir}/${localPlaylistName}`,
      );
    });
    audioDirs.forEach((audioDir, i) => {
      formattingArgs.push(
        "-map",
        `0:a:${i}`,
        "-c:a",
        "copy",
        "-f",
        "hls",
        "-hls_time",
        `${Processor.HLS_SEGMENT_TIME}`,
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        `${ENV_VARS.gcsVideoOutputMountedLocalDir}/${audioDir}/%d.ts`,
        `${ENV_VARS.gcsVideoOutputMountedLocalDir}/${audioDir}/${localPlaylistName}`,
      );
    });
    try {
      await spawnAsync(
        `${loggingPrefix} When formatting video to HLS:`,
        "ffmpeg",
        formattingArgs,
      );
    } catch (e) {
      // console.error(e);
      // TODO: Error handling.
      throw e;
    }
    // TODO: Write total bytes to a file.
  }
}
