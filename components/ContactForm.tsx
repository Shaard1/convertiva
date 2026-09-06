"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";

const SUPPORT_EMAIL = "hello@jaiidonee.com";
const topics = ["Support", "Bug report", "Feature request", "Privacy request", "Business inquiry"] as const;

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState<(typeof topics)[number]>("Support");
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  const topicRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTopicOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!topicRef.current?.contains(event.target as Node)) setIsTopicOpen(false);
    }
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setIsTopicOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isTopicOpen]);

  function selectTopic(nextTopic: (typeof topics)[number]) {
    setTopic(nextTopic);
    setIsTopicOpen(false);
  }

  function handleTopicKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = topics.indexOf(topic);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      selectTopic(topics[(currentIndex + offset + topics.length) % topics.length]);
    }
  }

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
    <label>What can we help with?</label>
    <div className="topic-select" ref={topicRef}>
      <input type="hidden" name="topic" value={topic} />
      <button type="button" className="topic-trigger" aria-haspopup="listbox" aria-expanded={isTopicOpen} onClick={() => setIsTopicOpen((current) => !current)} onKeyDown={handleTopicKeyDown}><span>{topic}</span><ChevronDown className={isTopicOpen ? "rotate-180" : ""} /></button>
      <div className={`topic-menu ${isTopicOpen ? "topic-menu-open" : ""}`} role="listbox" aria-label="Contact topic">{topics.map((item) => <button type="button" role="option" aria-selected={item === topic} className={item === topic ? "topic-option-selected" : ""} onClick={() => selectTopic(item)} key={item}><span>{item}</span>{item === topic ? <Check /> : null}</button>)}</div>
    </div>
    <label>Subject<input name="subject" required placeholder="A short summary" /></label>
    <label>Message<textarea name="message" required rows={6} placeholder="Tell us what happened. For bugs, include the converter, input format, file size, and error message—but do not attach confidential files." /></label>
    <button className="button-primary" type="submit">Open email draft <ArrowUpRight className="h-4 w-4" /></button>
    {sent ? <p className="text-sm text-[var(--muted-foreground)]" role="status">Your email app should open with a prepared message.</p> : null}
  </form>;
}
