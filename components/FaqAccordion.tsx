"use client";

import { useState } from "react";

type FaqAccordionProps = {
  items: readonly (readonly [question: string, answer: string])[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="faq-list">
      {items.map(([question, answer], index) => {
        const isOpen = openIndex === index;
        const answerId = `faq-answer-${index}`;

        return (
          <div className="faq-item" data-open={isOpen} key={question}>
            <button
              aria-controls={answerId}
              aria-expanded={isOpen}
              className="faq-question"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              type="button"
            >
              <span>{question}</span>
              <span aria-hidden="true" className="faq-icon">+</span>
            </button>
            <div className="faq-answer" id={answerId} inert={!isOpen}>
              <div>
                <p>{answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
