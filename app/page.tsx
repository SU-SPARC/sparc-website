import Image from "next/image";

const newsItems = [
  {
    title: "SPARC launches spring AI project tracks",
    date: "Mon, 23 Mar 2026",
    image: "/sparc-1.jpg",
  },
  {
    title: "Students share model demos at campus showcase",
    date: "Fri, 20 Mar 2026",
    image: "/sparc-2.jpg",
  },
  {
    title: "Weekly lab dives into LLM evaluation workflows",
    date: "Tue, 17 Mar 2026",
    image: "/sparc-3.jpg",
  },
  {
    title: "Contact office hours expanded for new members",
    date: "Sat, 14 Mar 2026",
    image: "/sparc-contact.jpeg",
  },
  {
    title: "Event planning team confirms April speaker panel",
    date: "Wed, 11 Mar 2026",
    image: "/sparc-events.jpeg",
  },
  {
    title: "Join program opens with beginner-friendly pods",
    date: "Sun, 8 Mar 2026",
    image: "/sparc-join.jpeg",
  },
  {
    title: "Capstone project groups publish first progress logs",
    date: "Thu, 5 Mar 2026",
    image: "/sparc-projects.jpeg",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
      <div className="flex min-h-screen flex-col text-zinc-900 dark:text-zinc-50 gap-y-6 sm:gap-y-8">
        <section className="grid gap-6 sm:gap-8 md:grid-cols-[3fr,2fr] md:items-center">
          <div className="space-y-4">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Suffolk University · Student Club
            </p>
            <h1 className="text-balance text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
              Suffolk Computing AI Research Club
            </h1>
            <p className="max-w-xl text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              SPARC is a student club at Suffolk University focused on applied machine learning and AI research. We build real projects, host workshops, and create a space for students across majors to explore the world of AI together.
            </p>
          </div>
        </section>

        <div className="relative h-48 sm:h-56 rounded-2xl bg-transparent md:h-64">
          <Image
            unoptimized
            src="/sparc-1.jpg"
            alt="SPARC Hero Image"
            fill
            className="rounded-2xl object-cover"
          />
        </div>

        <section className="space-y-4">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Latest Updates
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              News Articles
            </h2>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {newsItems.map((item) => (
              <article
                key={item.image}
                className="group relative h-64 min-w-[280px] overflow-hidden rounded-2xl border border-zinc-700 bg-black sm:min-w-[340px]"
              >
                <Image
                  unoptimized
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                <div className="absolute left-3 top-3 right-3">
                  <p className="inline-block bg-black/85 px-3 py-1 text-sm sm:text-base font-semibold leading-snug text-zinc-100">
                    {item.title}
                  </p>
                </div>

                <div className="absolute left-3 bottom-3">
                  <p className="bg-black/90 px-3 py-1.5 text-sm font-medium text-zinc-100">
                    {item.date}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
