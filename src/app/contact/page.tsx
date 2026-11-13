import type { Metadata } from "next";
import { ContactPage } from "@/components/contact/contact-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez EFA Talk — WhatsApp, téléphone, Facebook. English For All Academy.",
  alternates: { canonical: "https://www.efatalk.fyi/contact" },
};

export default function ContactRoute() {
  return <ContactPage />;
}
