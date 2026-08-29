"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Layout, Palette, Code, Share2, Target, Search } from "lucide-react"

const services = [
  {
    icon: Layout,
    title: "Web Design",
    description:
      "Wij ontwerpen websites die niet alleen visueel aantrekkelijk zijn, maar ook functioneel en gebruiksvriendelijk. Bij MSwebdesign staat jouw merk centraal en zorgen we ervoor dat jouw online uitstraling aansluit bij de doelen en waarden van je bedrijf.",
  },
  {
    icon: Palette,
    title: "Graphic Design",
    description:
      "Van logo's tot social media posts, wij leveren creatieve grafische ontwerpen die jouw merk versterken. Onze ontwerpen zijn uniek en professioneel, zodat ze de juiste indruk maken op jouw doelgroep.",
  },
  {
    icon: Code,
    title: "Web Development",
    description:
      "We bouwen websites die technisch sterk en toekomstbestendig zijn. Ons team zorgt voor betrouwbare, schaalbare en snelle websites die je bedrijf digitaal laten groeien en professioneel laten overkomen.",
  },
  {
    icon: Share2,
    title: "Social Media",
    description:
      "Een goede aanwezigheid op sociale media maakt tegenwoordig het verschil. Wij helpen je om impact te maken met aantrekkelijke visuals en effectieve strategieën, zodat je merk zichtbaar en betrokken blijft.",
  },
  {
    icon: Target,
    title: "Resultaatgericht",
    description:
      "Bij MSwebdesign gaan we voor succes. Onze aanpak is altijd gericht op het behalen van meetbare resultaten die bijdragen aan de groei van jouw bedrijf. Samen kijken we naar wat écht werkt.",
  },
  {
    icon: Search,
    title: "SEO",
    description:
      "Vindbaarheid is essentieel. Wij optimaliseren je website met de nieuwste SEO-technieken, zodat je hoger scoort in Google en je doelgroep je makkelijk kan vinden.",
  },
]

export function ServicesSection() {
  return (
    <section id="diensten" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 animate-pulse" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mx-auto block w-fit">
          ✨ Onze Expertise
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-balance">
          Waar we <span className="text-primary">écht goed</span> in zijn
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto text-pretty leading-relaxed text-lg">
          Van concept tot lancering - wij transformeren jouw digitale ambities naar krachtige online oplossingen die
          resultaat opleveren.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card
              key={index}
              className="group hover:border-primary transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-background/50 backdrop-blur-sm"
            >
              <CardHeader>
                <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <service.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">{service.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
