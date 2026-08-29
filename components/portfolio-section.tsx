"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

const projects = [
  {
    title: "De Omgekeerde Stemwijzer",
    category: "AI/ML & Web Development",
    image: "/omgekeerdestemwijzer-banner.png",
    description:
      "AI-powered app voor de Tweede Kamerverkiezingen 2025. Gebruikers stellen vragen over partijstandpunten en krijgen 100% feitelijke antwoorden uit officiële partijprogramma's met RAG-technologie.",
    url: "https://de-omgekeerde-stemwijzer.onrender.com/",
    tags: ["Next.js", "AI/ML", "RAG", "TypeScript"],
  },
  {
    title: "Autopoetsbedrijf Tahsin",
    category: "Web Design & Development",
    image: "/autopoetsbedrijf-tahsin-project.png",
    description:
      "Professionele website voor autopoetsbedrijf met meer dan 20 jaar ervaring. Complete presentatie van diensten, wasstraat en garage met modern, responsief design.",
    url: "https://www.autopoetsbedrijftahsin.nl/",
    tags: ["React", "Next.js", "Tailwind CSS"],
  },
  {
    title: "CAN Uitzendbureau",
    category: "Web Development",
    image: "/can-uitzendbureau-project.png",
    description:
      "Uitzendbureau gespecialiseerd in de tuinbouw regio Den Haag met 30 jaar ervaring. Website met diensten overzicht en directe contactmogelijkheden voor werkgevers en werkzoekenden.",
    url: "https://canbv.nl/",
    tags: ["Next.js", "React", "Tailwind CSS"],
  },
  {
    title: "Murat Sahin Portfolio",
    category: "Portfolio Website",
    image: "/murat-sahin-portfolio.png",
    description:
      "Professionele portfolio website voor full-stack developer. Showcase van projecten, skills en ervaring met modern, strak design en donker thema.",
    url: "https://murat-sahin-dev.vercel.app/",
    tags: ["Next.js", "TypeScript", "Tailwind CSS", ".NET Core"],
  },
]

export function PortfolioSection() {
  return (
    <section id="portfolio" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-balance">Ons Portfolio</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            Bekijk een selectie van onze recente projecten en ontdek hoe wij bedrijven helpen groeien met krachtige
            digitale oplossingen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <Card
              key={index}
              className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300"
            >
              <div className="relative overflow-hidden aspect-video">
                <img
                  src={project.image || "/placeholder.svg"}
                  alt={project.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => window.open(project.url, "_blank")}
                  >
                    Bekijk project <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-sm text-primary font-semibold mb-2">{project.category}</p>
                <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, tagIndex) => (
                    <span key={tagIndex} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
