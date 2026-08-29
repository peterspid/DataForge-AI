"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface QuoteFormDialogProps {
  packageName?: string
  variant?: "default" | "outline"
  className?: string
  children?: React.ReactNode
}

export function QuoteFormDialog({ packageName, variant = "default", className, children }: QuoteFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    package: packageName || "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Quote form submitted:", formData)
    // Here you would typically send the form data to your backend
    setOpen(false)
    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      package: packageName || "",
      message: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          {children || "Vraag Offerte Aan"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vraag een Offerte Aan</DialogTitle>
          <DialogDescription>
            Vul het formulier in en wij nemen zo snel mogelijk contact met u op voor een vrijblijvende offerte.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Uw volledige naam"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="uw@email.nl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefoonnummer *</Label>
            <Input
              id="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="06 12345678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Bedrijfsnaam (optioneel)</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Uw bedrijfsnaam"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="package">Gewenst Pakket *</Label>
            <Select
              value={formData.package}
              onValueChange={(value) => setFormData({ ...formData, package: value })}
              required
            >
              <SelectTrigger id="package">
                <SelectValue placeholder="Selecteer een pakket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Basis Website">Basis Website</SelectItem>
                <SelectItem value="Pro Pakket">Pro Pakket</SelectItem>
                <SelectItem value="Maatwerk">Maatwerk</SelectItem>
                <SelectItem value="Nog niet zeker">Nog niet zeker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Projectomschrijving *</Label>
            <Textarea
              id="message"
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Vertel ons over uw project, wensen en eventuele deadlines..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Annuleren
            </Button>
            <Button type="submit" className="flex-1">
              Verstuur Aanvraag
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
