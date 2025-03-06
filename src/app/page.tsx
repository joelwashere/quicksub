"use client"

import React, { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import { AlertCircle, Upload, Loader, FileText, Languages, Crown } from 'lucide-react';
import OpenAI from 'openai';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from '@/utils/supabase/client';
import SignInDialog from '@/components/sign-in-dialog';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { useRouter } from 'next/navigation';

const openai = new OpenAI({ apiKey: "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", dangerouslyAllowBrowser: true });

// Tier definitions
const TIERS = {
  FREE: {
    name: "Free",
    maxTranscriptions: 2,
    color: "bg-blue-600",
    description: "Transcribe up to 2 videos"
  },
  PLUS: {
    name: "Plus",
    maxTranscriptions: Infinity,
    color: "bg-purple-600",
    description: "Unlimited video transcriptions"
  }
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTier, setCurrentTier] = useState(TIERS.FREE);
  const [transcriptionsUsed, setTranscriptionsUsed] = useState(0);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loggedIn, setLoggedIn] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    handleOpenChange(true)
  }, [])

  const handleOpenChange = async(open: boolean) => {
    console.log("Handling change in open")
    await supabase.auth.getUser().then((session) => {
      const { data, error } = session
      if(error || !data?.user) {
        setLoggedIn(false);
        console.log("Not logged in")
      }
      else if(data.user) {
        setLoggedIn(true)
        console.log(data.user)
      }
    }) 
  }

  // Load saved tier and usage from localStorage
  useEffect(() => {
    const savedTier = localStorage.getItem('userTier');
    const savedUsage = localStorage.getItem('transcriptionsUsed');
    
    if (savedTier) {
      setCurrentTier(savedTier === 'PLUS' ? TIERS.PLUS : TIERS.FREE);
    }
    
    if (savedUsage) {
      setTranscriptionsUsed(parseInt(savedUsage, 10));
    }
  }, []);

  // Save tier and usage changes to localStorage
  useEffect(() => {
    localStorage.setItem('userTier', currentTier.name === 'Plus' ? 'PLUS' : 'FREE');
    localStorage.setItem('transcriptionsUsed', transcriptionsUsed.toString());
  }, [currentTier, transcriptionsUsed]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;
    
    // Check if the file is a video
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please upload a video file.');
      return;
    }
    
    console.log(selectedFile.name);
    setFile(selectedFile);
    setError('');
    setTranscription('');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    
    if (!droppedFile) return;
    
    if (!droppedFile.type.startsWith('video/')) {
      setError('Please upload a video file.');
      return;
    }
    
    console.log(droppedFile.name);
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

    // Check if user has transcriptions remaining
    if (transcriptionsUsed >= currentTier.maxTranscriptions) {
      setShowLimitWarning(true);
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
      
      // Increment usage count
      setTranscriptionsUsed(prev => prev + 1);

      console.log(transcriptionText);
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
  
  const handleUpgradeTier = async () => {

    //const url = await createCheckoutSession({userId: "hardar"})
    
    //f(url) router.push(url)
  }

  const changeTier = (tier: typeof TIERS.FREE | typeof TIERS.PLUS) => {
    setCurrentTier(tier);
    if(tier === TIERS.PLUS) {
      handleUpgradeTier()
    }
  };

  const transcriptionsRemaining = Math.max(0, currentTier.maxTranscriptions - transcriptionsUsed);
  const isLimitReached = transcriptionsUsed >= currentTier.maxTranscriptions;

  return (
    <main className="flex flex-col max-w-[1366px] mx-auto min-h-screen bg-background">
      <SignInDialog isOpen={!loggedIn} onOpenChange={handleOpenChange}/>
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Languages className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Quicksub</h1>
        </div>

        <div className="flex items-center space-x-4">
          
          {/* Tier Switcher */}
          <Dialog>
            <DialogTrigger asChild className="">
              <div className="flex gap-2">
                {/* Transcriptions Remaining Display */}
                <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100">
                  {currentTier.name === "Plus" ? (
                  <Crown className="h-4 w-4 text-purple-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-blue-500" />
                  )}
                  <span className={"text-sm font-medium ${isLimitReached ? 'text-red-500' : ''}"}>
                  {currentTier.name === "Plus" 
                    ? "Unlimited" 
                    : transcriptionsRemaining === 0 
                    ? "No transcriptions remaining" 
                    : `${transcriptionsRemaining} transcription${transcriptionsRemaining !== 1 ? 's' : ''} remaining`}
                  </span>
                </div>
                <Button variant="outline" className="flex items-center space-x-1">
                  <span className={`h-2 w-2 rounded-full ${currentTier.color === 'bg-purple-600' ? 'bg-purple-600' : 'bg-blue-600'}`}></span>
                  <span>{currentTier.name} Plan</span>
                </Button>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Choose your plan</DialogTitle>
                <DialogDescription>
                  Select the plan that best fits your needs
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <Card 
                  className={`cursor-pointer border-2 ${currentTier.name === 'Free' ? 'border-blue-600' : 'border-gray-200'}`}
                  onClick={() => changeTier(TIERS.FREE)}
                  >
                  <CardContent className="flex flex-col items-center p-6 space-y-2">
                    <FileText className={`h-8 w-8 ${currentTier.name === 'Free' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <h3 className="text-lg font-bold">Free</h3>
                    <p className="text-center text-sm text-gray-500">Transcribe up to 2 videos</p>
                    <p className="font-bold text-xl">$0</p>
                    {currentTier.name === 'Free' && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Current Plan</span>
                    )}
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer border-2 ${currentTier.name === 'Plus' ? 'border-purple-600' : 'border-gray-200'}`}
                  onClick={handleUpgradeTier}
                  >
                  <CardContent className="flex flex-col items-center p-6 space-y-2">
                    <Crown className={`h-8 w-8 ${currentTier.name === 'Plus' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <h3 className="text-lg font-bold">Plus</h3>
                    <p className="text-center text-sm text-gray-500">Unlimited transcriptions</p>
                    <p className="font-bold text-xl">$9.99<span className="text-sm text-gray-500">/mo</span></p>
                    {currentTier.name === 'Plus' && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Current Plan</span>
                    )}
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-4">
        <h2 className="text-xl">Welcome, get started by uploading a video!</h2>
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
                    setFile(null);
                    setTranscription("");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
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
                    ref={fileInputRef}
                    />
                </div>
              )}
            </div>
         
            {/* Controls */}
            <div className="my-6 p-4">
              <button
                className={`w-full py-3 rounded-md font-medium ${
                  isLoading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : !file
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isLimitReached && currentTier.name === 'Free'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                onClick={isLimitReached && currentTier.name === 'Free' ? () => setShowLimitWarning(true) : handleTranscribe}
                disabled={isLoading || !file}
                >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Transcribing... ({progress}%)
                  </span>
                ) : isLimitReached && currentTier.name === 'Free' ? (
                  'Upgrade to Plus to Transcribe More Videos'
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
              <div className="border rounded-lg p-6 mx-4 mb-4">
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

      {/* Limit Reached Alert Dialog */}
      <AlertDialog open={showLimitWarning} onOpenChange={setShowLimitWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Free Tier Limit Reached</AlertDialogTitle>
            <AlertDialogDescription>
              You've used all your free transcriptions. Upgrade to Plus for unlimited transcriptions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-purple-600 text-white hover:bg-purple-700"
              onClick={() => {
                changeTier(TIERS.PLUS);
                setShowLimitWarning(false);
              }}
              >
              Upgrade to Plus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}