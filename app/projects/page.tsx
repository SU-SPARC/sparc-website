import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function ProjectsPage() {
  const projects = [
    {
      name: "Smart Campus Navigator & Club Finder",
      status: "Completed",
      timeframe: "Spring 2025",
      link: "https://github.com/MohammedAlTal/Suffolk_CSMA",
      image: "/campus-map-home.png",
      description:
        "Our first ever group project focused on creating a smart campus navigation system and club finder to enhance student experience.",
      highlights: [
        "Built an interactive campus map and place search experience.",
        "Added club discovery and matching based on student interests.",
        "Presented a complete working prototype with team documentation.",
      ],
    },
    {
      name: "CollegiateX Mobile App",
      status: "Completed",
      timeframe: "Fall 2025",
      link: "https://collegiatex.com/",
      image: "/collegiatex-pc-home.png",
      description:
        "In the fall 2025, Mohammed, the president of SPARC, collaborated with CollegiateX and granted everyone at the club an internship to build their mobile app.",
      highlights: [
        "Collaborated with an external startup in a real internship setting.",
        "Contributed features and UX flows for the CollegiateX mobile app.",
        "Practiced agile teamwork, code reviews, and stakeholder feedback cycles.",
      ],
    },
    {
      name: "SPARC Website",
      status: "Completed",
      timeframe: "Spring 2026",
      link: "https://sparc-su.vercel.app",
      image: "/sparc-website-home.png",
      description:
        "A group of SPARC members is proposing to build and maintain a public website for the club, showcasing our mission, team, projects, and resources for members. This would be a great opportunity to learn web development and create something that represents SPARC to the wider community.",
      highlights: [
        "Defined the site information architecture and page structure.",
        "Implemented reusable UI components with responsive design.",
        "Planned long-term maintenance and contribution workflow for members.",
      ],
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
      <div className="flex min-h-screen flex-col text-zinc-900 dark:text-zinc-50 gap-y-6 sm:gap-y-8">
        <section className="space-y-3">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Software built and shipped by SPARC members. Every project is a real product with real users, we collaborate, iterate, and launch things that live beyond the classroom.
          </p>
        </section>

        <div className="relative h-48 sm:h-56 rounded-lg bg-transparent md:h-64">
          <Image
            unoptimized
            src="/sparc-projects.jpeg"
            alt="SPARC Projects Image"
            fill
            className="rounded-2xl object-cover"
          />
        </div>

        <section className="space-y-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Catalog</h1>
          <p className="max-w-2xl mb-8 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            What we have built so far and what we're planning next. Each project is a collaborative effort by SPARC members to ship something real, tools, apps, and platforms that solve actual problems.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6">
            {projects.map((project) => (
              <Card
                key={project.name}
                size="sm"
                className="group flex h-full flex-col overflow-hidden border-zinc-200/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/80"
              >
                <div className="relative -mx-4 -mt-4 mb-4 h-36 overflow-hidden sm:h-40">
                  <Image
                    unoptimized
                    src={project.image}
                    alt={`${project.name} preview`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <CardHeader className="mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <CardTitle className="text-sm sm:text-base leading-snug">{project.name}</CardTitle>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] sm:text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 whitespace-nowrap shrink-0">
                      {project.status}
                    </span>
                  </div>
                  <CardDescription className="text-xs sm:text-sm uppercase tracking-widest pt-1">
                    {project.timeframe}
                  </CardDescription>
                </CardHeader>

                <CardContent className="mb-4 text-sm sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {project.description}
                </CardContent>

                <CardContent className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-3">
                    What We Did
                  </p>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {project.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                {project.link && (
                  <CardContent className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <Button asChild size="sm" variant="outline" className="text-xs w-full">
                      <a href={project.link} target="_blank" rel="noreferrer">
                        View Project
                      </a>
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Propose a Project</CardTitle>
              <CardDescription className="text-xs">How members can pitch ideas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              <p>
                Have an idea for a product or tool? We encourage all members to pitch projects, whether it's a small utility, a mobile app, or something bigger. Email us with your idea and a brief motivation. We review proposals on a rolling basis and help you turn ideas into shipped software.
              </p>
            </CardContent>
            <CardFooter className="justify-start gap-2">
              <Button asChild size="sm" variant="outline" className="text-xs">
                <a href="mailto:sparc@studentorgs.suffolk.edu">Email SPARC</a>
              </Button>
            </CardFooter>
          </Card>
        </section>
      </div>
    </main>
  );
}

