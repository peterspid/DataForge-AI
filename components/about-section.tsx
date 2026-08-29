"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Sparkles } from "lucide-react"

const values = [
  { title: "Kwaliteit", description: "Hoogwaardige oplossingen die voldoen aan de hoogste standaarden" },
  { title: "Betaalbaarheid", description: "Professionele websites tegen eerlijke en transparante prijzen" },
  { title: "Transparantie", description: "Duidelijke communicatie en geen verborgen kosten" },
  { title: "Klantgericht", description: "Jouw wensen en doelen staan altijd centraal" },
  { title: "Toekomstbestendig", description: "Websites die meegroeien met jouw bedrijf" },
  { title: "Dynamisch", description: "Flexibel en snel inspelen op veranderende behoeften" },
]

const stats = [
  { number: "50+", label: "Projecten" },
  { number: "45+", label: "Tevreden klanten" },
  { number: "30+", label: "Gemaakte logo's" },
  { number: "3+", label: "Jaar ervaring" },
]

export function AboutSection() {
  return (
    <section id="over-ons" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            Over MSwebdesign
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-balance">
            Kwaliteit die{" "}
            <span className="text-primary relative">
              impact maakt
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                <path d="M0 4C50 2 150 6 200 4" stroke="currentColor" strokeWidth="2" className="text-primary" />
              </svg>
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            Een website laten maken hoeft niet duur te zijn. Wij maken voor onze klanten een op maat gemaakte website
            die perfect aansluit op ieder zijn wensen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {values.map((value, index) => (
            <Card
              key={index}
              className="border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group cursor-default">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform">
                {stat.number}
              </div>
              <div className="text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
