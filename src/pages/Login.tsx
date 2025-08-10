// src/pages/LoginPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="p-8 border rounded-lg shadow-md w-full max-w-md space-y-6 bg-card">
        <h1 className="text-2xl font-bold">Login</h1>

        <Button
          className="w-full cursor-pointer"
          onClick={() => signInWithGoogle()}
        >
          Sign in with Google
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          className="w-full cursor-pointer"
          onClick={() => signInWithEmail(email, password)}
        >
          Sign in with Email
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Don’t have an account?{" "}
          <Link to="/signup" className="underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
