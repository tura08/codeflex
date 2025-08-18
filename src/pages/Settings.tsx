import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Eye, EyeOff, Save } from "lucide-react"
import { GoogleDriveCard } from "@/pages/apps/SheetsManager/import/SheetsWidgets"

export default function SettingsPage() {
  const [dbUrl, setDbUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [notifications, setNotifications] = useState(true)
  const [defaultTemplate, setDefaultTemplate] = useState("Web App")
  const [language, setLanguage] = useState("en")
  const [slackWebhook, setSlackWebhook] = useState("")

  const handleSave = () => {
    console.log({
      dbUrl,
      supabaseKey,
      theme,
      notifications,
      defaultTemplate,
      language,
      slackWebhook,
    })
    alert("Settings saved (mock)")
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure integrations, appearance, and defaults for your workspace.
          </p>
        </div>
        <Button className="cursor-pointer" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Connect external services you want to use across apps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="dbUrl">Database URL</Label>
            <Input
              id="dbUrl"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="https://your-db-url"
            />
            <p className="text-xs text-muted-foreground">
              For example a Supabase or Postgres connection URL.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="supabaseKey">Supabase API Key</Label>
            <div className="flex gap-2">
              <Input
                id="supabaseKey"
                type={showKey ? "text" : "password"}
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="your-anon-key"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowKey((s) => !s)}
                className="shrink-0"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Store secrets securely in production. This is just a local mock.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
            <Input
              id="slackWebhook"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/..."
            />
            <p className="text-xs text-muted-foreground">
              Used for simple deploy or error notifications.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Drive & Sheets */}
      <GoogleDriveCard />

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Theme and notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label>Theme</Label>
              <p className="text-xs text-muted-foreground">
                Switch between light, dark, or follow the system.
              </p>
            </div>
            <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label>Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Enable important alerts for builds and errors.
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={(checked) => setNotifications(checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>
            Default values used when creating a new app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label>Default Template</Label>
              <p className="text-xs text-muted-foreground">
                Pre-selects a template in the new app flow.
              </p>
            </div>
            <Select
              value={defaultTemplate}
              onValueChange={(v) => setDefaultTemplate(v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Choose template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Web App">Web App</SelectItem>
                <SelectItem value="CLI Tool">CLI Tool</SelectItem>
                <SelectItem value="Mobile App">Mobile App</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label>Language</Label>
              <p className="text-xs text-muted-foreground">
                UI language for system messages and defaults.
              </p>
            </div>
            <Select value={language} onValueChange={(v) => setLanguage(v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* sticky save for long pages */}
      <div className="sticky bottom-4">
        <div className="rounded-xl border bg-card p-3 shadow-sm flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Changes are local in dev. Wire secrets & storage later.
          </span>
          <Button className="cursor-pointer" onClick={handleSave} size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
