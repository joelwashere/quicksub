"use server"

import { promisify } from "util";
import path from 'path';
import fs from 'fs';
import os from "os";
import { v4 as uuidv4 } from 'uuid';
import ytdl from "@distube/ytdl-core";
import OpenAI from "openai";

// If you prefer to initialize a global OpenAI client here, uncomment the line below and provide your key in an environment variable.
// export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
]

//const copyFile = promisify(fs.copyFile);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

type DownloadResult = {
  success: boolean;
  filePath?: string;
  message: string;
  error?: string;
};

//export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
export async function translate(targetLang: string, text: string) {

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (!openai.apiKey) {
    throw new Error("The OPENAI_API_KEY environment variable is not set.");
  }

  //Validate text
  //Send to OpenAI with prompt
  const translation = await openai.completions.create({
    model: "gpt-3.5-turbo-instruct-0914",
    prompt: `You are an expert translator. Translate the following text to ${targetLang}: ${text}. This is an SRT file. Only change lines that contain words`,
    max_tokens: 3000
  });
  //Return result
  console.log(translation)
  
  return translation.choices[0].text;
}

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
