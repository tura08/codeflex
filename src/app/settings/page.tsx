// File: src/app/settings/page.tsx
'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  const [dbUrl, setDbUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [notifications, setNotifications] = useState(true)
  const [defaultTemplate, setDefaultTemplate] = useState('Web App')
  const [language, setLanguage] = useState('en')
  const [slackWebhook, setSlackWebhook] = useState('')

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
    alert('Settings saved (mock)')
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Database & API */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Integrations</h2>
        <div>
          <Label htmlFor="dbUrl">Database URL</Label>
          <Input
            id="dbUrl"
            value={dbUrl}
            onChange={(e) => setDbUrl(e.target.value)}
            placeholder="https://your-db-url"
          />
        </div>
        <div>
          <Label htmlFor="supabaseKey">Supabase API Key</Label>
          <Input
            id="supabaseKey"
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            placeholder="your-anon-key"
          />
        </div>
        <div>
          <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
          <Input
            id="slackWebhook"
            value={slackWebhook}
            onChange={(e) => setSlackWebhook(e.target.value)}
            placeholder="https://hooks.slack.com/..."
          />
        </div>
      </div>

      <Separator />

      {/* Appearance */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <Label>Theme</Label>
          <Select onValueChange={(v) => setTheme(v as any)} defaultValue={theme}>
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
        <div className="flex items-center justify-between">
          <Label>Notifications</Label>
          <Switch
            checked={notifications}
            onCheckedChange={(checked) => setNotifications(checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Defaults */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Defaults</h2>
        <div className="flex items-center justify-between">
          <Label>Default Template</Label>
          <Select
            onValueChange={(v) => setDefaultTemplate(v)}
            defaultValue={defaultTemplate}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Choose template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Web App">Web App</SelectItem>
              <SelectItem value="CLI Tool">CLI Tool</SelectItem>
              <SelectItem value="Mobile App">Mobile App</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label>Language</Label>
          <Select onValueChange={(v) => setLanguage(v)} defaultValue={language}>
            <SelectTrigger className="w-40">
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
      </div>

      <Separator />

      {/* Save Button */}
      <div className="pt-4">
        <Button onClick={handleSave} className="w-full">
          Save Settings
        </Button>
      </div>
    </div>
  )
}
