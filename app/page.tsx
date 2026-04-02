import WritingText from "@/components/ui/writing-text";
import HeroSlideshow from "@/components/ui/hero-slideshow";
import NewsCarousel from "@/components/ui/news-carousel";

const newsletter = [
  {
    title: "SPARC launches spring AI project tracks",
    description: "Professor Zhipeng Huang from Suffolk University shares insights on the transformative impact of AI in education, research, and industry. Discover how AI is reshaping learning experiences, driving innovation, and preparing students for the future of work in this exclusive interview.",
    date: "Sun, 23 Mar 2026",
    image: "/sparc-3.jpg",
  },
  {
    title: "Students share model demos at campus showcase",
    description: "Weekly stories from club workshops, project demos, and member spotlights. We share quick recaps, upcoming opportunities, and practical AI insights from our sessions on campus.",
    date: "Fri, 20 Mar 2026",
    image: "/sparc-contact.jpeg",
  },
  {
    title: "Weekly lab dives into LLM evaluation workflows",
    description: "Weekly stories from club workshops, project demos, and member spotlights. We share quick recaps, upcoming opportunities, and practical AI insights from our sessions on campus.",
    date: "Tue, 17 Mar 2026",
    image: "/sparc-events.jpeg",
  },
  {
    title: "Contributing members recognized at spring meetup",
    description: "Weekly stories from club workshops, project demos, and member spotlights. We share quick recaps, upcoming opportunities, and practical AI insights from our sessions on campus.",
    date: "Sat, 14 Mar 2026",
    image: "/sparc-join.jpeg",
  },
  {
    title: "New AI research project collaborations announced",
    description: "Weekly stories from club workshops, project demos, and member spotlights. We share quick recaps, upcoming opportunities, and practical AI insights from our sessions on campus.",
    date: "Wed, 11 Mar 2026",
    image: "/sparc-projects.jpeg",
  },
  {
    title: "SPARC hosts open workshop on prompt engineering",
    description: "Weekly stories from club workshops, project demos, and member spotlights. We share quick recaps, upcoming opportunities, and practical AI insights from our sessions on campus.",
    date: "Mon, 9 Mar 2026",
    image: "/sparc-2.jpg",
  },
];

const gallery = [
  "/sparc-1.jpg",
  "/sparc-2.jpg",
  "/sparc-3.jpg",
  "/sparc-4.jpeg",
  "/sparc-5.jpeg",
  "/sparc-6.jpeg",
  "/sparc-7.jpeg",
  "/sparc-8.jpeg",
  "/sparc-join.jpeg",
  "/sparc-contact.jpeg",
  "/sparc-events.jpeg",
  "/sparc-projects.jpeg",
];

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
            <WritingText className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight" text="Suffolk Programming, AI & Research Club" />
            <p className="mt-4 max-w-xl text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              SPARC is a student club at Suffolk University focused on applied machine learning and AI research. We build real projects, host workshops, and create a space for students across majors to explore the world of AI together.
            </p>
          </div>
        </section>

        <HeroSlideshow images={gallery} />

        <section className="space-y-4">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Latest Updates
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              News Articles
            </h2>
          </div>

          <NewsCarousel items={newsItems} href="/events" />
        </section>

        {/*
        
<section className="space-y-4">
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-200/80 bg-white/75 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="space-y-1">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Latest Updates
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-semibold tracking-tight">
                News Articles
              </h1>
              <p className="max-w-xl text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Stay up to date with the latest news, events, and project highlights from SPARC. 
              </p>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {newsletter.map((item, i) => (
                <div
                  key={i}
                  className="relative flex-none w-56 sm:w-64 h-48 sm:h-56 rounded-2xl overflow-hidden snap-start cursor-pointer group"
                >
                  <Image
                    unoptimized
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/20 to-black/70" />
                  <p className="absolute top-3 left-3 right-3 text-white text-xs sm:text-sm font-semibold leading-snug line-clamp-3 ">
                    {item.title}
                  </p>
                  <p className="absolute bottom-3 left-3 text-white text-[10px] sm:text-xs">
                    {item.date}
                  </p>
                </div>
              ))}
            </div>

            <Button asChild size="sm" className="w-fit">
              <Link href="/events">
                See Events
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        */}
      </div>
    </main>
  );
}