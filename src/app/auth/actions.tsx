"use client"

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/client';

export async function signInWith(provider: any) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}`,
    },
  })

  console.log(data)

  if(error) {
    redirect('/error')
  } else if (data.url) {
    redirect(data.url)
  }

  //revalidatePath('/', 'layout')
  //redirect('/')
}

export async function signOut() {
  /*const supabase = createClient()

  const { error } = await supabase.auth.signOut({ scope: "local" })

  if(error)
    console.log(error)

  //redirect("http://localhost:3000")

*/}