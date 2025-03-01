"use client"

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { AlertCircle, Upload, Loader, FileText, CheckCircle } from 'lucide-react';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: "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", dangerouslyAllowBrowser: true });

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [apiKey, setApiKey] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;
    
    // Check if the file is a video
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please upload a video file.');
      return;
    }
    
    setFile(selectedFile);
    setError('');
    setTranscription('');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    
    const droppedFile = e.dataTransfer.files[0];
    
    if (!droppedFile) return;
    
    if (!droppedFile.type.startsWith('video/')) {
      setError('Please upload a video file.');
      return;
    }
    
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
    if (!apiKey) {
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

    if (!apiKey) {
      setError('Please enter your Deepgram API key.');
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
    <div className="flex flex-col w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Video Transcription with OpenAI</h1>
      
      {/* API Key Input */}
      <div className="mb-6">
        <label htmlFor="apiKey" className="block text-sm font-medium mb-2 text-gray-700">
          API Key
        </label>
        <input
          type="password"
          id="apiKey"
          className="w-full p-3 border border-gray-300 rounded-md"
          placeholder="Enter your Deepgram API key"
          value={apiKey}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
        />
      </div>
      
      {/* File Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-lg p-6 mb-6 text-center ${
          file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'
        }`}
        onDrop={handleDrop}
        onDragOver={preventDefault}
        onDragEnter={preventDefault}
      >
        {file ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
            <p className="text-lg font-medium text-gray-800">{file.name}</p>
            <p className="text-sm text-gray-500">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <button 
              className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
              onClick={() => {
                setFile(null);
                setTranscription('');
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-lg font-medium text-gray-800">Drag and drop your video file here</p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handleFileChange}
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse files
            </button>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="mb-6">
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
    </div>
  );
};