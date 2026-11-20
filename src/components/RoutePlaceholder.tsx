import { Link } from "@/i18n/navigation";

type Props = {
  title: string;
  description: string;
  back: string;
};

export function RoutePlaceholder({ title, description, back }: Props) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg2 px-5">
      <section className="w-full max-w-xl rounded-2xl border border-line bg-card p-8 text-center shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <span className="gradient-mix grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white">N</span>
          <span className="display text-xl font-extrabold tracking-tight">NATEA</span>
        </Link>

        <h1 className="display mt-8 text-4xl font-extrabold">{title}</h1>
        <p className="mt-4 leading-7 text-muted">{description}</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-teal px-6 py-3.5 font-bold text-white transition hover:bg-teal-d">{back}</Link>
      </section>
    </main>
  );
}
