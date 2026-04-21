import Image from "next/image";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const team = [
  {
    name: "Mohammed Khodor Firas Al-Tal",
    role: "President - Class of 2026",
    image: "/mo.jpeg",
    website: "https://mohammedkhodoraltal.com/",
    linkedin: "https://www.linkedin.com/in/mohammed-al-tal/",
    blurb:
      "Hey there, I'm an undergraduate researcher in Computer Science and Applied Math at Suffolk University, passionate about AI for health, scientific discovery, and public benefit.",
  },
  {
    name: "Sarmad Shah",
    role: "Vice-President - Class of 2026",
    image: "/sarmad.jpeg",
    linkedin: "https://www.linkedin.com/in/sarmadshah03/",
    blurb:
      "Hey, I'm a Computer Science Student at Suffolk University.",
  },
  {
    name: "Kyle Erhabor",
    role: "Treasurer - Class of 2026",
    image: "/kyle.jpeg",
    website: "https://kyleerhabor.com/",
    linkedin: "https://www.linkedin.com/in/kyleerhabor/",
    blurb:
      "Hi, I'm a software developer studying Computer Science at Suffolk University in Boston, MA. I spend my days studying and developing software.",
  },
  {
    name: "Endi Fejzollari",
    role: "Secretary - Class of 2027",
    image: "/endi.jpeg",
    linkedin: "https://www.linkedin.com/in/endi-fejzollari-716aab181/",
    blurb:
      "Hey, I'm a Computer Science Student at Suffolk University.",
  },
  {
    name: "Montasir Moyen",
    nickname: "Monty",
    role: "Project Lead (Website) - Class of 2027",
    image: "/monty.jpg",
    website: "https://montasirmoyen.com/",
    linkedin: "https://www.linkedin.com/in/montasirmoyen/",
    blurb:
      "Hello, I'm a Computer Science student at Suffolk University and a Software Developer & Engineer, check out my blogs: montasirmoyen.com/blog",
  },
  {
    name: "Kanan Guliyev",
    role: "Founding Member - Class of 2027",
    image: "/kanan.jpg",
    linkedin: "https://www.linkedin.com/in/kananguliyev/",
    blurb:
      "Hey, I'm a Computer Science Student at Suffolk University.",
  },
  {
    name: "Andrew Yuen",
    role: "Founding Member - Class of 2027",
    image: "/andrew.jpeg",
    linkedin: "https://www.linkedin.com/in/andrew-yuen-su/",
    blurb:
      "Hey, I'm a Computer Science Student at Suffolk University.",
  },
  {
    name: "Margulan Kudaibergen",
    role: "Founding Member - Class of 2028",
    image: "/margulan.jpeg",
    linkedin: "https://www.linkedin.com/in/margulan-kudaibergen/",
    blurb:
      "Hi, I'm a software engineer studying Computer Science at Suffolk University. I am obsessed with building meaningful products that help people.",
  },
  {
    name: "Bexultan Abila",
    role: "Founding Member - Class of 2027",
    image: "/bex.jpg",
    linkedin: "https://www.linkedin.com/in/beksabila/",
    blurb:
      "Aspiring software engineer focused on scalable architecture, clean code, and continuous technical growth.",
  },
  {
    name: "Allan Nguyen",
    role: "Founding Member - Class of 2027",
    image: "/allan.jpeg",
    website: "https://www.allandng.com/",
    linkedin: "https://www.linkedin.com/in/allan-nguyen-b2236529b/",
    blurb:
      "Hey, I'm a Computer Science Student at Suffolk University.",
  },
  {
    name: "Anthony Sek",
    role: "Founding Member - Class of 2026",
    image: "/anthony.jpeg",
    linkedin: "https://www.linkedin.com/in/anthony1sek/",
    blurb:
      "Hey, I'm a Computer Science Student at Suffolk University.",
  },
  {
    name: "Yunus Abdurahman",
    role: "Founding Member - Class of 2027",
    image: "/yunus.jpeg",
    linkedin: "https://www.linkedin.com/in/yunus-abdurahman/",
    blurb:
      "Hey, I'm a Computer Science Student at Suffolk University.",
  },
];

const team2026 = [
  {
    name: "Kanan Guliyev",
    role: "President - Class of 2026",
  },
  {
    name: "Montasir Moyen",
    role: "Vice-President & Project Lead - Class of 2026",
  },
  {
    name: "Bexultan Abila",
    role: "Treasurer - Class of 2026",
  },
  {
    name: "Endi Fejzollari",
    role: "Secretary - Class of 2026",
  },
];

export default function TeamPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
      <div className="flex min-h-screen flex-col text-zinc-900 dark:text-zinc-50 gap-y-6 sm:gap-y-8">
        <section className="space-y-3">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Team</h1>
          <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Meet the team behind SPARC. We are a group of diverse and passionate students at Suffolk University, united by our love for technology and AI.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-500 dark:text-zinc-400">
            Team of 2026
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {team2026.map((leader) => {
              const member = team.find((person) => person.name === leader.name);

              if (!member) {
                return null;
              }

              return (
                <Card key={`2026-${member.name}`} className="relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-0">
                    <Image
                      unoptimized
                      src={member.image}
                      alt=""
                      fill
                      aria-hidden
                      className="object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-white/75 dark:bg-zinc-950/75" />
                  </div>

                  <CardHeader className="relative z-10 border-b pb-0">
                    <div className="flex items-start gap-2">
                      <div className="relative w-16 sm:w-24 aspect-square shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                        <Image
                          unoptimized
                          src={member.image}
                          alt={member.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="space-y-0.5 px-2 sm:px-4 min-w-0">
                        <div>
                          <CardTitle className="text-xs sm:text-base wrap-break-word">
                            {member.name}
                            {member.nickname && (
                              <span className="text-zinc-500 dark:text-zinc-400 font-normal text-[10px] sm:text-xs">
                                {" "}
                                ({member.nickname})
                              </span>
                            )}
                          </CardTitle>
                        </div>

                        <CardDescription className="text-[10px] sm:text-xs">
                          {leader.role}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 mb-2 sm:mt-4">
                    {member.website && (
                      <Button asChild size="xs" variant="outline" className="mr-2 text-xs">
                        <a href={member.website} target="_blank" rel="noreferrer">
                          Visit Website
                        </a>
                      </Button>
                    )}
                    {member.linkedin && (
                      <Button asChild size="xs" variant="outline" className="text-xs">
                        <a href={member.linkedin} target="_blank" rel="noreferrer">
                          Visit LinkedIn
                        </a>
                      </Button>
                    )}
                  </CardContent>
                  <CardContent className="relative z-10 text-[11px] sm:text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {member.blurb}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-500 dark:text-zinc-400">
            Team of 2025
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {team.map((member) => (
              <Card key={member.name} className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0">
                  <Image
                    unoptimized
                    src={member.image}
                    alt=""
                    fill
                    aria-hidden
                    className="object-cover opacity-20"
                  />
                  <div className="absolute inset-0 bg-white/75 dark:bg-zinc-950/75" />
                </div>

                <CardHeader className="relative z-10 border-b pb-0">
                  <div className="flex items-start gap-2">
                    <div className="relative w-16 sm:w-24 aspect-square shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                      <Image
                        unoptimized
                        src={member.image}
                        alt={member.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="space-y-0.5 px-2 sm:px-4 min-w-0">
                      <div>
                        <CardTitle className="text-xs sm:text-base wrap-break-word">
                          {member.name}
                          {member.nickname && (
                            <span className="text-zinc-500 dark:text-zinc-400 font-normal text-[10px] sm:text-xs">
                              {" "}
                              ({member.nickname})
                            </span>
                          )}
                        </CardTitle>
                      </div>

                      <CardDescription className="text-[10px] sm:text-xs">
                        {member.role}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 mb-2 sm:mt-4">
                  {member.website && (
                    <Button asChild size="xs" variant="outline" className="mr-2 text-xs">
                      <a href={member.website} target="_blank" rel="noreferrer">
                        Visit Website
                      </a>
                    </Button>
                  )}
                  {member.linkedin && (
                    <Button asChild size="xs" variant="outline" className="text-xs">
                      <a href={member.linkedin} target="_blank" rel="noreferrer">
                        Visit LinkedIn
                      </a>
                    </Button>
                  )}
                </CardContent>
                <CardContent className="relative z-10 text-[11px] sm:text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {member.blurb}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

