"use client"

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { AlertCircle, Upload, Loader, FileText, CheckCircle, Languages } from 'lucide-react';
import OpenAI from 'openai';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const openai = new OpenAI({ apiKey: "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", dangerouslyAllowBrowser: true });

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [apiKey, setApiKey] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;
    
    // Check if the file is a video
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please upload a video file.');
      return;
    }
    
    console.log(selectedFile.name)
    setFile(selectedFile);
    setError('');
    setTranscription('');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    
    const droppedFile = e.dataTransfer.files[0];
    
    if (!droppedFile) return;
    
    if (!droppedFile.type.startsWith('video/')) {
      setError('Please upload a video file.');
      return;
    }
    
    console.log(droppedFile.name)
    setFile(droppedFile);
    setError('');
    setTranscription('');
  };

  const preventDefault = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  const extractAudio = async (videoFile: File): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      // Create an off-screen video element
      const video = document.createElement('video');
      video.src = URL.createObjectURL(videoFile);
      
      video.onloadedmetadata = () => {
        // Create an audio context
        const audioContext = new (window.AudioContext)();
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        
        // Create a MediaRecorder to capture audio
        const recorder = new MediaRecorder(destination.stream);
        const chunks: BlobPart[] = [];
        
        recorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          resolve(blob);
        };
        
        // Start recording and playing
        recorder.start();
        video.play();
        
        // Stop recording when the video ends
        video.onended = () => {
          recorder.stop();
          video.remove();
        };
        
        // Fallback if video.onended doesn't fire
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
            video.remove();
          }
        }, video.duration * 1000 + 1000); // Add 1 second buffer
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };
    });
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    if (!openai.apiKey) {
      throw new Error('Please enter your API key');
    }

    const audiofile = new File([audioBlob], 'audiofile', {
      type: 'audio/wav',
    });

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: audiofile, 
        model: "whisper-1",
        response_format: "text"
      });

      return transcription;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Transcription failed: ${error.message}`);
      }
      throw new Error('Transcription failed with an unknown error');
    }
  };

  const handleTranscribe = async (): Promise<void> => {
    if (!file) {
      setError('Please upload a video file first.');
      return;
    }

    if (!openai.apiKey) {
      setError('No API key detected.');
      return;
    }

    setIsLoading(true);
    setError('');
    setProgress(10);

    try {
      setProgress(30);
      const audioBlob = await extractAudio(file);
      
      setProgress(60);
      const transcriptionText = await transcribeAudio(audioBlob);
      
      setProgress(100);
      setTranscription(transcriptionText);

      console.log(transcriptionText)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Languages className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Quicksub</h1>
        </div>
      </header>
      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-4">
        {/* File Upload Area */}
        <Card className="w-full max-w-4xl">
          <CardContent className="p-0">
            <div
              className={`flex flex-col items-center justify-center h-[60vh] border-2 border-dashed rounded-lg transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
              }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDragEnter={preventDefault}
        >
          {file ? (
            <div className="flex flex-col items-center space-y-4 p-6">
              <video
                className="max-h-[40vh] max-w-full rounded-lg shadow-lg"
                controls
                src={URL.createObjectURL(file)}
              />
              <div className="flex flex-col items-center">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <Button variant="outline" onClick={() => {
                setFile(null)
                setTranscription("")
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
                }
                }}>
                Remove
              </Button>
                </div>
            ) : (
            <div className="flex flex-col items-center space-y-4 p-6">
              <Upload className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium">Upload your video</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Drag and drop your video file here, or click the button below to select a file
                </p>
              </div>
              <label htmlFor="video-upload">
                <Button asChild>
                  <span>Select Video</span>
                </Button>
              </label>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>
         
        {/* Controls */}
        <div className="my-6">
          <button
            className={`w-full py-3 rounded-md font-medium ${
              isLoading || !file
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            onClick={handleTranscribe}
            disabled={isLoading || !file}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Transcribing... ({progress}%)
              </span>
            ) : (
              'Transcribe Video'
            )}
          </button>
        </div>
           
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 rounded">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}
        
        {/* Transcription Results */}
        {transcription && (
          <div className="border rounded-lg p-6">
            <div className="flex items-center mb-4">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-xl font-medium text-gray-800">Transcription</h2>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="whitespace-pre-wrap">{transcription}</p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                onClick={() => {
                  navigator.clipboard.writeText(transcription);
                }}
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        )}
        </CardContent>
      </Card>
      </div>
    </main>
  );
};