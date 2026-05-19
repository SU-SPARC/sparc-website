import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
      <div className="flex min-h-screen flex-col text-zinc-900 dark:text-zinc-50 gap-y-6 sm:gap-y-8">
        <section className="space-y-3">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">About SPARC</h1>
          <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            We're a student club at Suffolk University where we build and ship real software, explore AI agentic coding, discuss what's happening in tech, and help members land real-world internships. Open to all majors.
          </p>
        </section>

        <div className="relative h-48 sm:h-56 rounded-lg bg-transparent md:h-64">
          <Image
            unoptimized
            src="/sparc-3.jpg"
            alt="SPARC About Image"
            fill
            className="rounded-2xl object-cover"
          />
        </div>

        <section className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Mission</CardTitle>
              <CardDescription className="text-xs">Why the club exists</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                We exist to give students hands-on experience building real software and shipping it to actual users. We use AI agentic coding tools, collaborate on projects with real stakes, and create pathways for members to gain industry experience through internships.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Focus Areas</CardTitle>
              <CardDescription className="text-xs">What SPARC does</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
              <ul className="list-disc space-y-1 pl-5">
                <li>AI agentic coding. Building software with AI-powered tools and workflows.</li>
                <li>Shipping real products used by real people.</li>
                <li>Tech talks and discussions on industry trends.</li>
                <li>Internship opportunities and career development in tech.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:gap-6 md:grid-cols-[3fr,2fr] md:items-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Club Story</CardTitle>
              <CardDescription className="text-xs">How SPARC started and where it&apos;s going</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <p>
                SPARC was founded in 2025 by a group of students who wanted to build real things, not just study theory. We started small and quickly grew into a community of builders from across majors, united by a shared drive to create software that matters.
              </p>
              <p>
                Formerly Computational Science and Mathematics (CSMA), we rebranded to SPARC in 2026 to better reflect who we are: a programming and AI club that ships software, secures internships for members, and stays plugged into where technology is actually heading.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

