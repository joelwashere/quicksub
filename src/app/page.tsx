"use client"

import React, { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import OpenAI from 'openai';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { createStripeSession } from '@/lib/payments/stripe';
import { User } from '@supabase/auth-js';

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
  const [user, setUser] = useState<User | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    //handleOpenChange(true)
  }, [])

  const handleOpenChange = async(open: boolean) => {
    await supabase.auth.getUser().then((session) => {
      const { data, error } = session
      if(error || !data?.user) {
        setLoggedIn(false);
        console.log("Not logged in")
      }
      else if(data.user) {
        setLoggedIn(true)
        setUser(data.user)
      }
    }) 
/*    try {

      const {data, error} = await supabase
        .from("profiles")
        .update({subscription_plan: "plus"})
        .eq("name", "Joel")

      if (error)
        throw new Error("Failed to select profile " + error.message)

      console.log(data)

    } catch(error) {
      console.log(error)
    }
    */
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

  const handleSignOut = () => {
    alert("Signing out...")
  }

  const handleManageSubscription = () => {
    alert("Redirecting to subscription management...")
  }

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

    const url = await createStripeSession()
    console.log("Created session " + url)
    if(url) router.push(url)
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
      {/*<SignInDialog isOpen={!loggedIn} />*/}
      <p>Hi guys</p>
    </main>
  );
}