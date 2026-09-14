"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const SUPPORT_EMAIL = "hello@jaiidonee.com";
const topics = ["Support", "Bug report", "Feature request", "Privacy request", "Business inquiry"] as const;

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState<(typeof topics)[number]>("Support");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = encodeURIComponent(`[Convertiva ${topic}] ${data.get("subject")}`);
    const body = encodeURIComponent(`Name: ${data.get("name")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`);
    setSent(true);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return <form className="contact-form" onSubmit={handleSubmit}>
    <div className="form-row"><label>Name<input name="name" autoComplete="name" required placeholder="Your name" /></label><label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label></div>
    <label htmlFor="contact-topic">What can we help with?
      <select id="contact-topic" name="topic" value={topic} onChange={(event) => setTopic(event.target.value as (typeof topics)[number])}>
        {topics.map((item) => <option key={item}>{item}</option>)}
      </select>
    </label>
    <label>Subject<input name="subject" required placeholder="A short summary" /></label>
    <label>Message<textarea name="message" required rows={4} placeholder="Tell us what happened. For bugs, include the converter, input format, file size, and error message—but do not attach confidential files." /></label>
    <button className="button-primary" type="submit">Open email draft <ArrowUpRight className="h-4 w-4" /></button>
    {sent ? <p className="form-notice" role="status">Your email app should open with a prepared message.</p> : null}
  </form>;
}
