import "./dev/env";
import { ENV_VARS } from "./env_vars";
import { DirectoryStreamUploader } from "./r2_directory_stream_uploader";
import { spawnAsync } from "./spawn";
import { mkdir } from "fs/promises";

export class Processor {
  public static create(): Processor {
    return new Processor(DirectoryStreamUploader.create);
  }

  private static HLS_SEGMENT_TIME = 6; // sec
  private static TEMP_DIR = "./temp";

  public constructor(
    private createDirectoryStreamUploader: (
      loggingPrefix: string,
      localDir: string,
      remoteBucket: string,
      remoteDir: string,
    ) => DirectoryStreamUploader,
  ) {}

  public async run(
    loggingPrefix: string,
    gcsFilename: string,
    r2RootDir: string,
    r2VideoBucketName: string,
    localMasterPlaylistName: string,
    localPlaylistName: string,
    videoDirOptional: Array<string>,
    audioDirs: Array<string>,
  ): Promise<void> {
    console.log(`${loggingPrefix} Start HLS formatting.`);
    await Promise.all([
      ...videoDirOptional.map((videoDir) =>
        mkdir(`${Processor.TEMP_DIR}/${videoDir}`, {
          recursive: true,
        }),
      ),
      ...audioDirs.map((audioDir) =>
        mkdir(`${Processor.TEMP_DIR}/${audioDir}`, {
          recursive: true,
        }),
      ),
    ]);
    let videoDirUploaderOptional = videoDirOptional.map((videoDir) =>
      this.createDirectoryStreamUploader(
        loggingPrefix,
        `${Processor.TEMP_DIR}/${videoDir}`,
        r2VideoBucketName,
        `${r2RootDir}/${videoDir}`,
      ).start(),
    );
    let audioDirUploaders = audioDirs.map((audioDir) =>
      this.createDirectoryStreamUploader(
        loggingPrefix,
        `${Processor.TEMP_DIR}/${audioDir}`,
        r2VideoBucketName,
        `${r2RootDir}/${audioDir}`,
      ).start(),
    );

    let formattingArgs: Array<string> = [
      "-n",
      "19",
      "ffmpeg",
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
        `${Processor.TEMP_DIR}/${videoDir}/%d.ts`,
        "-master_pl_name",
        `${localMasterPlaylistName}`,
        `${Processor.TEMP_DIR}/${videoDir}/${localPlaylistName}`,
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
        `${Processor.TEMP_DIR}/${audioDir}/%d.ts`,
        `${Processor.TEMP_DIR}/${audioDir}/${localPlaylistName}`,
      );
    });
    let error: any;
    try {
      await spawnAsync(
        `${loggingPrefix} When formatting video to HLS:`,
        "nice",
        formattingArgs,
      );
    } catch (e) {
      // console.error(e);
      // TODO: Error handling.
      error = e;
    }
    await Promise.all([
      ...videoDirUploaderOptional.map(async (videoDirUploader, i) => {
        await videoDirUploader.flush();
        // videoDirOptional[i].totalBytes = totalBytes;
      }),
      ...audioDirUploaders.map(async (audioDirUploader, i) => {
        await audioDirUploader.flush();
        // audioDirs[i].totalBytes = totalBytes;
      }),
    ]);
    if (error) {
      throw error;
    }
    // TODO: Write total bytes to a file.
  }
}
