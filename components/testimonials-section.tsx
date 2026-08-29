"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Quote } from "lucide-react"

const testimonials = [
  {
    quote:
      "Snel en doeltreffend! Ik zocht een logo die mijn bedrijf perfect zou laten zien en bij MSwebdesign hebben ze mij niet teleurgesteld. :)",
    name: "Patrick",
    role: "Ondernemer",
  },
  {
    quote:
      "Voor onze stichting wilden we onze oude website volledig vernieuwen en een heleboel handmatige taken automatiseren. MSwebdesign heeft voor ons een mooi product neergezet, volledig op maat met programmatuur waardoor we niet meer alles handmatig hoeven te doen.",
    name: "Mehmet",
    role: "Voorzitter non-profit stichting",
  },
  {
    quote:
      "Voor mijn nieuwe bedrijf wilde ik een mooie frisse website die als visitekaartje zou functioneren. Nu heb ik een prachtige en snelle website die ook nog eens goed te vinden is op Google! Echt top.",
    name: "Youri",
    role: "Ondernemer",
  },
]

export function TestimonialsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    let animationFrameId: number
    let scrollPosition = 0
    const scrollSpeed = 0.5

    const scroll = () => {
      scrollPosition += scrollSpeed

      if (scrollContainer.scrollWidth && scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0
      }

      scrollContainer.scrollLeft = scrollPosition
      animationFrameId = requestAnimationFrame(scroll)
    }

    animationFrameId = requestAnimationFrame(scroll)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30 overflow-hidden">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-balance">
          Wat onze klanten over ons zeggen
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto text-pretty leading-relaxed">
          Zoals we altijd doen, gaat kwaliteit bij ons voorop. Daarnaast streven we altijd naar zoveel mogelijk
          transparantie, zodat onze klanten weten waar ze aan toe zijn.
        </p>

        <div className="relative">
          <div ref={scrollRef} className="flex gap-6 overflow-x-hidden" style={{ scrollBehavior: "auto" }}>
            {/* Duplicate testimonials for seamless loop */}
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <Card key={index} className="flex-shrink-0 w-[90vw] sm:w-[450px] border-none shadow-lg">
                <CardContent className="p-8">
                  <Quote className="h-8 w-8 text-primary mb-4" />
                  <p className="text-base sm:text-lg mb-6 leading-relaxed text-pretty min-h-[120px]">
                    {testimonial.quote}
                  </p>
                  <div>
                    <p className="font-semibold text-lg">{testimonial.name}</p>
                    <p className="text-muted-foreground text-sm">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
