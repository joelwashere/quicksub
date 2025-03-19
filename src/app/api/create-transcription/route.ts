import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({ apiKey: "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" });

export async function POST(request: NextRequest) {
  const { title, description, filePath } = await request.json();
  let transcriptionText: string;
  let transcription;

  const transcribeAudio = async (filePath: string): Promise<string> => {
    if (!openai.apiKey) {
      throw new Error('Please enter your API key');
    }

    //const audiofile = file
    //console.log(audiofile.name)
    //console.log(audiofile.type)

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath), 
        model: "whisper-1",
        response_format: "srt",
      });
      console.log(transcription)
      return transcription.toString();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Transcription failed: ${error.message}`);
      }
      throw new Error('Transcription failed with an unknown error');
    }
  };

  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser();

    if(!user)
      throw new Error("User not found")

    const { data: subscription_plan } = await supabase
      .from("profiles")
      .select("subscription_plan")
      .single()

    const { data, error } = await supabase
      .from("transcriptions")
      .insert({
        title, 
        description,
        completed: false,
        user_id: user.id
      })
      .select()
      .single()

    if (error)
      throw new Error("Error: " + error.message)

    //Transcription info
    //console.log(data)

    {
      const { data } = await supabase
        .from("usage_tracking")
        .select("transcriptions_created")
        .single()
      
      if(!data)
        throw new Error("Couldn't get usage info")

      if(typeof subscription_plan === "string" && 
        (data.transcriptions_created > 2 && subscription_plan == 'plus'))
        throw new Error("Over transcription limit.")
    }

    //TODO : Convert file (if necessary), transcribe, and return the transcription
    //Find file in temp dir
    /*
    const fileBuffer = await fs.promises.readFile(filePath);
    const fileName = path.basename(filePath);
    const file = new File([fileBuffer], fileName, {type: "video/mp4"});
    
    if(!file)
      throw new Error("Couldn't obtain file")
    else
      console.log("File created: " + file.name)*/

    //Send to Speech-to-text API for transcription
    transcription = await transcribeAudio(filePath)
    //console.log(transcription)
    //Return the transcription 
    transcriptionText = transcription;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Error message: ${errorMessage}`);
    return NextResponse.json(
      {message: `Error: ${errorMessage}`},
      {status: 400}
    );
  }

  //TODO : Return the transcript
  return NextResponse.json({text: transcriptionText })
}