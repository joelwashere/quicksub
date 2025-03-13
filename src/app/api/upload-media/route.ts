import { copyFileToTemp } from '@/utils/useAPI';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Copy file to temp directory
    const tempFilePath = await copyFileToTemp(file);

    //console.log(tempFilePath)
    // Return the result
    return NextResponse.json({
      filename: file.name,
      path: tempFilePath 
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}