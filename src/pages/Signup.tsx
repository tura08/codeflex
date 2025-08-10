// src/pages/SignupPage.tsx
import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function SignupPage() {
  const { signUpWithEmail, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const canSubmit =
    isEmail(email) && password.length >= 6 && confirm === password

  const handleSignup = async () => {
    setError(null)
    setInfo(null)

    // client-side guards
    if (!isEmail(email)) return setError("Please enter a valid email.")
    if (password.length < 6)
      return setError("Password must be at least 6 characters.")
    if (password !== confirm) return setError("Passwords do not match.")

    setPending(true)
    try {
      await signUpWithEmail(email, password)
      // If confirmations are ON, tell the user to check mail.
      setInfo(
        "Check your inbox to verify your account. "
      )
      // Optional: navigate to login right away
      // navigate("/login")
    } catch (e: any) {
      setError(e?.message ?? "Sign up failed.")
    } finally {
      setPending(false)
    }
  }

  const handleMagicLink = async () => {
    setError(null)
    setInfo(null)
    if (!isEmail(email)) return setError("Enter a valid email for the magic link.")
    setPending(true)
    try {
      await signInWithMagicLink(email)
      setInfo("Magic link sent! Check your inbox.")
    } catch (e: any) {
      setError(e?.message ?? "Failed to send magic link.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded bg-destructive text-destructive-foreground p-3 text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded bg-secondary text-secondary-foreground p-3 text-sm">
              {info}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={isEmail(email) || email === "" ? "" : "border-destructive"}
            />
            {!isEmail(email) && email !== "" && (
              <p className="text-xs text-destructive">Invalid email format.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={password === "" || password.length >= 6 ? "" : "border-destructive"}
            />
            {password !== "" && password.length < 6 && (
              <p className="text-xs text-destructive">
                Must be at least 6 characters.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirm">
              Confirm password
            </label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={confirm === "" || confirm === password ? "" : "border-destructive"}
            />
            {confirm !== "" && confirm !== password && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>

          <Button
            disabled={!canSubmit || pending}
            onClick={handleSignup}
            className="w-full cursor-pointer"
          >
            Create account
          </Button>

          <div className="text-center text-xs text-muted-foreground">or</div>

          <Button
            variant="outline"
            onClick={handleMagicLink}
            disabled={!isEmail(email) || pending}
            className="w-full cursor-pointer"
          >
            Send Magic Link
          </Button>

          <div className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link to="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
