import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { FaDiscord, FaHandshake } from "react-icons/fa";
import { MdEmail } from "react-icons/md";

export default function ContactPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
      <div className="flex min-h-screen flex-col text-zinc-900 dark:text-zinc-50 gap-y-6 sm:gap-y-8">
        <section className="space-y-3">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Contact</h1>
          <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            We&apos;d love to hear from you! Whether you have questions about joining, want to propose a project, or just want to connect, feel free to reach out through any of the channels below. We&apos;re always happy to chat with students, faculty, and anyone interested in learning more about SPARC.
          </p>
        </section>

        <div className="relative h-48 sm:h-56 rounded-lg bg-transparent md:h-64">
          <Image
            unoptimized
            src="/sparc-contact.jpeg"
            alt="SPARC Contact Image"
            fill
            className="rounded-2xl object-cover"
          />
        </div>

        <section className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
          <Card size="sm" className="flex flex-col">
            <CardHeader className="mb-2 border-b-0 pb-0">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <MdEmail className="size-5" />
                Email
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-2 text-xs sm:text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              <p className="flex-1">Contact us anytime at our official club email address: sparc@studentorgs.suffolk.edu</p>
              <Button asChild size="sm" variant="outline" className="text-xs">
                <a href="mailto:sparc@studentorgs.suffolk.edu">Email SPARC</a>
              </Button>
            </CardContent>
          </Card>

          <Card size="sm" className="flex flex-col">
            <CardHeader className="mb-2 border-b-0 pb-0">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <FaDiscord className="size-5" />
                Community Server
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-2 text-xs sm:text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              <p className="flex-1">
                We planned to start up a Discord server for community discussions, project collaboration, and event announcements.
              </p>
              <Button asChild size="sm" variant="outline" className="text-xs">
                <a href="https://discord.gg/W8veDYAku6">Join Discord</a>
              </Button>
            </CardContent>
          </Card>

          <Card size="sm" className="flex flex-col">
            <CardHeader className="mb-2 border-b-0 pb-0">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <FaHandshake className="size-5" />
                Club Advisor
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-2 text-xs sm:text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              <div className="flex gap-3 flex-1 mb-8">
                <div className="relative w-24 h-24 rounded-lg shrink-0 overflow-hidden">
                  <Image
                    src="/professor-anthony.jpeg"
                    alt="Professor Anthony Gentilucci"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <p>
                    Reach out to our club advisor, Professor Anthony Gentilucci for any questions related to club operations, event planning, or general inquiries about SPARC.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="text-xs w-full">
                <a href="mailto:argentilucci@suffolk.edu">Email Professor Gentilucci</a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Location & Meeting Times</CardTitle>
              <CardDescription className="text-xs">Where to find SPARC on campus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              <p>
                We typically hold meetings in person on campus, but we are also open to virtual or hybrid formats depending on member preferences and needs. Our regular meeting times are still being finalized, but we aim to find a schedule that works for as many members as possible. We will share meeting details and locations with members once they join, and we always welcome feedback on how to make our meetings more accessible and convenient for everyone.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

