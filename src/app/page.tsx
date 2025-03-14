"use client"

import React, { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import { AlertCircle, Upload, Loader, FileText, Languages, Crown } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { createStripeSession } from '@/utils/payments/stripe';
import { User } from '@supabase/auth-js';
import SignInDialog from '@/components/sign-in-dialog';
import ProfileWidget from '@/components/profile-widget';
import { downloadVideo } from '@/utils/useAPI';

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
    description: "Transcribe up to 100 videos"
  }
};

// Supported audio and video mime types
const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/ogg', 'audio/webm', 'audio/flac', 'audio/aac', 'audio/mp4'
];

const SUPPORTED_VIDEO_TYPES = [
  'video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'video/x-ms-wmv', 'video/x-matroska'
];

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
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [isYoutubeVideo, setIsYoutubeVideo] = useState(false)
  const [videoId, setVideoId] = useState<string | null>("")

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    initUI()
  }, [])

  //Initializes the UI values based on user info
  const initUI = async() => {
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

    try {

      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .single()
      
      //console.log(data)
      
      setCurrentTier(data?.subscription_plan == 'plus' ? TIERS.PLUS : TIERS.FREE);
      
    } catch (error) {
      console.log(error)
    }
    
    try {
      const {data, error} = await supabase
      .from("usage_tracking")
      .select("transcriptions_created")
      .single()
      
      setTranscriptionsUsed(data?.transcriptions_created);
    } catch (error) {
      console.log(error)
    }
  }

  const handleSignOut = () => {
    alert("Signing out...")
  }

  const handleManageSubscription = async () => {
    const url = await createStripeSession()
    router.push(url!)
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
    setVideoId(null)
    setIsYoutubeVideo(false)
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

  const transcriptionsRemaining = Math.max(0, currentTier.maxTranscriptions - transcriptionsUsed);
  const isLimitReached = transcriptionsUsed >= currentTier.maxTranscriptions;

  const handleVideoUrl = (): void => {
    // Reset any previous errors
    setError("")

    // YouTube URL validation regex
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})$/
    const match = videoUrl.match(youtubeRegex)

    if (!match) {
      setError("Please enter a valid YouTube URL")
      return
    }

    // Extract the video ID
    const extractedVideoId = match[4]
    setVideoId(extractedVideoId)
    setIsYoutubeVideo(true)
    setFile(null)

    // Clear the file input if it has a value
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleTranscribe = async (): Promise<void> => {
    if (!file && !isYoutubeVideo) {
      setError('Please upload a video or use a valid link first.');
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
      let parsed, text, pathToFile, title;

      setProgress(30);
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadedFile = await fetch(`/api/upload-media`, {
          method: "POST",
          body: formData
        })
        title = file.name
        text = await uploadedFile.text()
        parsed = JSON.parse(text)
        pathToFile = parsed.path
//        pathToFile = file.formData
      } else if (isYoutubeVideo && videoId) {
        const downloadedVideo = await downloadVideo(videoUrl)
        if (downloadedVideo.success) {
          pathToFile = downloadedVideo.filePath
          title = "Video"
        }
        console.log(downloadedVideo)
      }
      
      setProgress(60);
      const transcription = await fetch(`/api/create-transcription`, {
        method: "POST",
        body: JSON.stringify({ title: title, description: "", filePath: pathToFile})
      })
      //const transcription = await createTranscription(file.name, "A video I'd like to transcribe", pathToFile.path)
      const responseText = await transcription.text()
      const parsedTranscription = JSON.parse(responseText)
      
      setProgress(100);
      setTranscription(parsedTranscription.text);

      //console.log(transcriptiom?);

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
    <main className="flex flex-col max-w-[1366px] mx-auto min-h-screen bg-background">
      <SignInDialog isOpen={!loggedIn} />
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
                    ? "100" 
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
                  onClick={handleManageSubscription}
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
                  onClick={handleManageSubscription}
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
        <ProfileWidget
              user={{
                name: user?.identities?.[0].identity_data?.full_name || "User",
                email: user?.email  || "",
              }}
            />
        </div>
      </header>

      {/* Main Content - New Dynamic Layout */}
      <div className="flex-1 p-6 flex flex-col md:flex-row gap-6">
        {/* Left Panel - Upload */}
        <div
          className={`w-full ${transcription ? "md:w-1/2" : "md:w-full"} flex flex-col transition-all duration-500 ease-in-out`}
        >
          <h2 className="text-xl font-bold mb-4">Upload your video</h2>
          <Card className="flex-1">
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
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null)
                        setTranscription("")
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ""
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : isYoutubeVideo && videoId ? (
                  <div className="flex flex-col w-3/5 items-center space-y-4 p-6">
                    <iframe
                      className="max-h-[35vh] w-full aspect-video rounded-lg shadow-lg"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                    <div className="flex flex-col items-center">
                      <p className="font-medium">YouTube Video</p>
                      <p className="text-sm text-muted-foreground">ID: {videoId}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsYoutubeVideo(false)
                        setVideoId(null)
                        setVideoUrl("")
                        setTranscription("")
                      }}
                    >
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
                    <div className="my-8 text-center">
                      <p className="text-sm text-muted-foreground">or</p>
                    </div>
                    <div className="mt-4 flex w-full max-w-md mx-auto">
                      <input
                        type="text"
                        placeholder="Paste YouTube URL"
                        className="flex-1 px-4 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => setVideoUrl(e.target.value)}
                        value={videoUrl}
                      />
                      <Button className="rounded-l-none" onClick={handleVideoUrl} disabled={isLoading}>
                        Load
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="mt-4">
            <button
              className={`w-full py-3 rounded-md font-medium ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : (!file && !isYoutubeVideo)
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : isLimitReached && currentTier.name === "Free"
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              onClick={
                isLimitReached && currentTier.name === "Free" ? () => setShowLimitWarning(true) : handleTranscribe
              }
              disabled={isLoading || (!file && !isYoutubeVideo)}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Transcribing... ({progress}%)
                </span>
              ) : isLimitReached && currentTier.name === "Free" ? (
                "Upgrade to Plus to Transcribe More Videos"
              ) : (
                "Transcribe Video"
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 rounded">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Transcription - Only show when there's a transcription */}
        {transcription && (
          <div
            className="w-full md:w-1/2 flex flex-col transition-all duration-500 ease-in-out transform origin-left"
            style={{
              animation: "expandPanel 0.5s ease-out forwards",
            }}
          >
            <h2 className="text-xl font-bold mb-4">Transcription</h2>
            <Card className="flex-1">
              <CardContent className="p-6">
                <div className="h-full">
                  <div className="flex items-center mb-4">
                    <FileText className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-xl font-medium">Results</h3>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md h-[40vh] overflow-auto">
                    <p className="whitespace-pre-wrap">{transcription}</p>
                  </div>
                  <div className="flex justify-between mt-4">
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setTranscription("")}
                    >
                      Clear Transcription
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(transcription)
                      }}
                    >
                      Copy to Clipboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
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
                setShowLimitWarning(false);
                handleManageSubscription()
              }}
              >
              Upgrade to Plus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes expandPanel {
          from {
            opacity: 0;
            transform: scaleX(0.8);
          }
          to {
            opacity: 1;
            transform: scaleX(1);
          }
        }
      `}</style>
    </main>
  );
}