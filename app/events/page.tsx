import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function EventsPage() {
  type EventItem = {
    title: string;
    date: string;
    type: string;
    location: string;
    description: string;
  };

  type RecordingItem = {
    title: string;
    date: string;
    type: string;
    link: string;
    description: string;
  };

  const upcomingEvents: EventItem[] = [];

  const pastHighlights: EventItem[] = [
    {
      title: "SPARC Website Development I",
      date: "March 31, 2026",
      type: "Development",
      location: "73 Tremont Room 8065",
      description:
        "Part 1: Join us for a dev discussion on the development of the SPARC website, where members will share their ideas and plans for building and maintaining the site. This is a great opportunity to get involved in web development and contribute to our online presence!",
    },
    {
      title: "SPARC Website Intro Panel",
      date: "February 12, 2026",
      type: "Panel",
      location: "73 Tremont Room 8065",
      description:
        "Join us for an introductory panel discussion about the SPARC website and how members can get involved.",
    },
    {
      title: "Professor Z. Huang's Guest Lecture on ML",
      date: "February 5, 2026",
      type: "Guest",
      location: "73 Tremont Room 8065",
      description:
        "We had the privilege of having Professor Z. Huang, a professor in the Computer Science department, for a guest lecture on machine learning research. Professor Huang shared insights from their latest work in natural language processing and engaged in a lively Q&A session with our members. It was an inspiring event that sparked great discussions and motivated many of us to dive deeper into ML research.",
    }
  ];

  const pastRecordings: RecordingItem[] = [
    {
      title: "Meeting 1",
      date: "February 26, 2026",
      type: "Zoom Recording",
      link: "https://suffolk.zoom.us/rec/play/YM0vPAyEnmg06qQFb73LIOqeUnd9X67yeQSyNJXdzkEwY0vVwo9RndIrFkl0rmV4UJTNAsH_mx9T8jj5.YWen7KysJWaujsOP?eagerLoadZvaPages=sidemenu.billing.plan_management&accessLevel=meeting&canPlayFromShare=true&from=share_recording_detail&continueMode=true&oldStyle=true&componentName=rec-play&originRequestUrl=https%3A%2F%2Fsuffolk.zoom.us%2Frec%2Fshare%2FjGnuwrQ-G0zXyDXA59_caQ3csajOglqWP7PbkDq0uKWIp-dY-Ty_vTLrIay41wCv.f6L6cPvH2Zs29L60",
      description: "Development meeting recording covering project updates and implementation discussion.",
    },
    {
      title: "Meeting 2",
      date: "March 24, 2026",
      type: "Zoom Recording",
      link: "https://suffolk.zoom.us/rec/play/OVjfXxrQKRNvOOhjp7zAcx5pHCTUHQ3w2FhEN0SRORkWo7BcFtoH3edi0NKLOeO4xyrcy3jBIX4PxW_n.9Wg9uEz-vEWMVDfa?eagerLoadZvaPages=sidemenu.billing.plan_management&accessLevel=meeting&canPlayFromShare=true&from=share_recording_detail&continueMode=true&oldStyle=true&componentName=rec-play&originRequestUrl=https%3A%2F%2Fsuffolk.zoom.us%2Frec%2Fshare%2FdTUmT8tGpGdRxRpJPIiAIOEHpPA9us7CADcmqsHNAOmGqovD0qOOh9ZsQA_VcujY.BjJrVRW8NNpaCBAk",
      description: "Development meeting recording focused on planning and next milestones.",
    },
    {
      title: "Meeting 3",
      date: "April 3, 2026",
      type: "Zoom Recording",
      link: "https://suffolk.zoom.us/rec/share/6FIftvYGrz3OemUrGQOm-ShzaOKu4hJSZqD75zzHDJvbY33wlDhM50ceavXfR_jW.JF2MxqyOxNq1Aks3",
      description: "Coding and implementation meeting recording where we worked on the website's frontend development tasks.",
    }
  ];

  const EventCard = ({ event }: { event: EventItem }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm sm:text-base">{event.title}</CardTitle>
        <CardDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <span>{event.date}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 w-fit">
            {event.type}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {event.location}
        </p>
        <p className="text-xs sm:text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
          {event.description}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
      <div className="flex min-h-screen flex-col text-zinc-900 dark:text-zinc-50 gap-y-6 sm:gap-y-8">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="space-y-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Events</h1>
            <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Stay posted for upcoming SPARC events! We host workshops, talks, panels, and social gatherings to build community and share knowledge. Check back here for the latest updates on what we have planned.
            </p>
          </div>
        </section>

        <div className="relative h-48 sm:h-56 rounded-lg bg-transparent md:h-64">
          <Image
            unoptimized
            src="/sparc-6.jpeg"
            alt="SPARC Event Image"
            fill
            className="rounded-2xl object-cover"
          />
        </div>

        <section className="grid gap-4 sm:gap-6 md:grid-cols-[3fr,2fr] md:items-start">
          <div className="space-y-4">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Upcoming
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => <EventCard key={event.title} event={event} />)
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                  No upcoming events right now. Check back soon for updates.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              PAST
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {pastHighlights.map((event) => (
                <EventCard key={event.title} event={event} />
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Past Zoom Recordings
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            {pastRecordings.map((recording) => (
              <Card key={recording.title}>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">{recording.title}</CardTitle>
                  <CardDescription className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <span>{recording.date}</span>
                    <span className="w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 sm:text-[11px]">
                      {recording.type}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-xs">
                  <p>{recording.description}</p>
                  <a
                    href={recording.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
                  >
                    Watch Recording
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

