import { notFound } from "next/navigation";

// Routes that are not built yet render the localized not-found page inside the site shell.
export default function UnknownRoute() {
  notFound();
}
