import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Brain, Github, Mail } from "lucide-react"
import Link from "next/link"

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-2xl font-semibold">StudyMate</span>
          </Link>
          <h1 className="text-2xl font-bold text-balance">Create your account</h1>
          <p className="text-muted-foreground text-pretty">Join thousands of learners using StudyMate</p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign up for StudyMate</CardTitle>
            <CardDescription>Create your account to start learning with AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Social Signup */}
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="w-full bg-transparent">
                <Mail className="mr-2 h-4 w-4" />
                Google
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Signup Form */}
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" type="text" placeholder="Alex Johnson" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="alex@university.edu" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role (Optional)</Label>
                <Select>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="researcher">Researcher</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </form>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
