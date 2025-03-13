"use server"

import { promisify } from "util";
import path from 'path';
import fs from 'fs';
import os from "os";
import { v4 as uuidv4 } from 'uuid';

const copyFile = promisify(fs.copyFile);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

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
