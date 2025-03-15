"use server"

import { promisify } from "util";
import path from 'path';
import fs from 'fs';
import os from "os";
import { v4 as uuidv4 } from 'uuid';
import ytdl from "@distube/ytdl-core";

//const copyFile = promisify(fs.copyFile);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

type DownloadResult = {
  success: boolean;
  filePath?: string;
  message: string;
  error?: string;
};

export async function downloadVideo(videoUrl: string): Promise<DownloadResult> {
  try {
    // Get YouTube URL from form data
    //const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
    
    if (!videoUrl || !ytdl.validateURL(videoUrl)) {
      return { 
        success: false, 
        message: 'Invalid YouTube URL',
        error: 'Please provide a valid YouTube URL'
      };
    }

    // Get video info
    const info = await ytdl.getInfo(videoUrl);
    
    // Create temp file path
    const uniqueId = uuidv4();
    const tempDir = path.join(os.tmpdir(), 'transcription-app');
    const filePath = path.join(tempDir, `${uniqueId}.mp4`);
    
    // Create write stream
    const writeStream = fs.createWriteStream(filePath);
    /*
    const agentForARandomIP = ytdl.createAgent(undefined, {
      localAddress: getRandomIPv6("2001:2::/48"),
    });*/
    
    // Download video and handle as promise
    return new Promise((resolve, reject) => {
      ytdl(videoUrl, {
        quality: "lowest",
        filter: "audioandvideo",
        //agent: agentForARandomIP
      })
      .pipe(writeStream)
      .on('finish', () => {
        console.log(`Video downloaded to: ${filePath}`);
        resolve({
          success: true,
          filePath,
          message: 'Video downloaded successfully to temporary folder'
        });
      })
      .on('error', (err: any) => {
        console.error('Error downloading video:', err);
        fs.unlink(filePath, () => {}); // Clean up partial file
        reject({
          success: false,
          message: 'Failed to download video',
          error: err.message
        });
      });
    });
  } catch (error) {
    console.error('Download error:', error);
    return { 
      success: false, 
      message: 'Failed to download video',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function copyFileToTemp(file: File): Promise<string> {
  try {
    // Create a buffer from the file data
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate a unique filename
    const uniqueId = uuidv4();
    const fileExtension = path.extname(file.name);
    const tempFileName = `${uniqueId}${fileExtension}`;
    
    // Define the temp directory path
    const tempDir = path.join(os.tmpdir(), 'transcription-app');
    
    // Create the temp directory if it doesn't exist
    try {
      await stat(tempDir);
    } catch (error) {
      await mkdir(tempDir, { recursive: true });
    }
    
    // Define the destination path
    const destPath = path.join(tempDir, tempFileName);
    
    // Write the file to the temp directory
    await fs.promises.writeFile(destPath, buffer);
    
    return destPath;
  } catch (error) {
    console.error('Error copying file to temp directory:', error);
    throw new Error(`Failed to copy file to temp directory:` + error);
  }
}
