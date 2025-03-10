"use client"

import { useState } from "react"
import { ChevronDown, CreditCard, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/app/auth/actions"
import { createStripeSession } from "@/lib/payments/stripe"
import { useRouter } from "next/navigation"

interface ProfileWidgetProps {
  user?: {
    name: string
    email: string
  }
}

export default function ProfileWidget({
  user = {
    name: "John Doe",
    email: "john@example.com",
  },
}: ProfileWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const handleManageSubscription = async() => {
    const url = await createStripeSession()

    if(url) router.push(url)
  }

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-full"
            aria-label="Profile menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {/* <span className="font-medium hidden sm:inline-block">{user.name}</span> */}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={handleManageSubscription}>
            <CreditCard className="h-4 w-4" />
            <span>Manage Subscription</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

