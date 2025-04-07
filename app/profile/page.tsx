"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Profile {
  username: string
  website: string
  avatar_url: string
}

export default function Profile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile>({
    username: "",
    website: "",
    avatar_url: "",
  })
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/")
        return
      }

      setSession(session)
      await getProfile(session)
      setLoading(false)
    }

    checkSession()
  }, [router])

  async function getProfile(session: any) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, website, avatar_url")
        .eq("id", session.user.id)
        .single()

      if (error) throw error

      if (data) {
        setProfile({
          username: data.username || "",
          website: data.website || "",
          avatar_url: data.avatar_url || "",
        })
      }
    } catch (error) {
      console.log("Error loading profile: ", error)
    }
  }

  async function updateProfile() {
    try {
      setLoading(true)

      if (!session?.user) throw new Error("No user")

      const updates = {
        id: session.user.id,
        username: profile.username,
        website: profile.website,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("profiles").upsert(updates)

      if (error) throw error
    } catch (error) {
      console.log("Error updating profile: ", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="text" value={session?.user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={profile.username || ""}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={profile.website || ""}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/")}>
            Cancel
          </Button>
          <Button onClick={updateProfile} disabled={loading}>
            {loading ? "Loading..." : "Update"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

