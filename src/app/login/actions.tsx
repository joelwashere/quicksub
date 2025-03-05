'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signInWith(provider: any) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  //const data = {
  //  email: formData.get('email') as string,
  //  password: formData.get('password') as string,
  //}

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: "http://localhost:3000/auth/callback",
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