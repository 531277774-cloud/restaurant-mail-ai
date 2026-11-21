import { siteConfig } from "@/config/site";

export const FAQ_ITEMS = [
  {
    question: "Is Restaurant Mail AI really free?",
    answer:
      "Yes. V1 has no accounts, no login, and no credit card. You can generate and copy both plain text and HTML templates for free.",
  },
  {
    question: "What types of restaurant emails can I create?",
    answer:
      "Promotions and offers, win-back and loyalty emails, menu launches, event and booking emails, review requests, and welcome emails.",
  },
  {
    question: "Is the generated email CAN-SPAM compliant?",
    answer:
      "The HTML template includes CAN-SPAM placeholder fields for your physical mailing address and an unsubscribe link. Replace those placeholders with your real business information before sending.",
  },
  {
    question: "Can I edit the generated email?",
    answer:
      "Yes. You can edit the subject, preview text, and body directly, and you can ask the AI to refine the email with follow-up instructions like make it shorter or more casual.",
  },
  {
    question: "Do I need email marketing experience to use it?",
    answer:
      "No. You only need to describe the email you want in one sentence. The tool asks a few follow-up questions when it needs more detail, then generates ready-to-send copy.",
  },
  {
    question: "What is Restaurant Mail AI?",
    answer:
      "Restaurant Mail AI is a free AI email copywriting tool built for restaurant owners and operators. Describe your email goal and it writes the subject line, preview text, body copy, and HTML template for your restaurant email marketing.",
  },
];

export const FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
});

export const ORGANIZATION_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Restaurant Mail AI",
  url: siteConfig.url,
});
