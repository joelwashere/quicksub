"use client"

import type React from "react"
import { useState } from "react"
import { Upload, Languages } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function Home() {
  const [sourceLanguage, setSourceLanguage] = useState("")
  const [targetLanguage, setTargetLanguage] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [videoLink, setVideoLink] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleVideoLinkSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (videoLink.trim()) {
      console.log("Processing video link:", videoLink)
      setFile(null)
    }
  }

  const handleTranslate = () => {
    if (file) {
      console.log("Translating uploaded video:", file.name)
    } else if (videoLink) {
      console.log("Translating video from link:", videoLink)
    }
  }

  const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "ru", label: "Russian" },
    { value: "zh", label: "Chinese" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" },
  ]

  return (
    <main className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Languages className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Quicksub</h1>
        </div>
        
      </header>

      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-4">
        <form onSubmit={handleVideoLinkSubmit} className="w-full max-w-4xl">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="Input video link"
              className="flex-1"
            />
          </div>
        </form>
        <Card className="w-full max-w-4xl">
          <CardContent className="p-0">
            <div
              className={`flex flex-col items-center justify-center h-[60vh] border-2 border-dashed rounded-lg transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
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
                  <Button variant="outline" onClick={() => setFile(null)}>
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
          </CardContent>
        </Card>
        <div className="flex sm:flex-col sm:space-y-4 md:flex-row md:space-y-0 items-center md:space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Source:</span>
            <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Target:</span>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="w-full max-w-4xl" size="lg" onClick={handleTranslate} disabled={!file && !videoLink}>
          Translate Video
        </Button>
      </div>
    </main>
  )
}

