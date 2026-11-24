import { siteConfig } from "@/config/site";

export const FAQ_ITEMS = [
  {
    question: "What is Restaurant Mail AI?",
    answer:
      "Restaurant Mail AI is a free AI email copywriting tool built for restaurant owners and operators. Describe your email goal in one sentence, and the tool writes the subject line, preview text, body copy, CTA, and HTML template for your restaurant email marketing.",
  },
  {
    question: "How do I use Restaurant Mail AI?",
    answer:
      "Simply type one sentence describing the email you want to create for your restaurant. The tool will ask a few follow-up questions only when it needs more detail, then generate a ready-to-send email. You can copy the plain text or the HTML template directly.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Restaurant Mail AI is completely free to use. There are no accounts, no login requirements, and no credit card needed. You can generate and copy both plain text and HTML email templates for free.",
  },
  {
    question: "Do I need a subscription?",
    answer:
      "No subscription is required. You can use the tool without signing up for a paid plan.",
  },
  {
    question: "How long does it take to get my email?",
    answer:
      "Your restaurant marketing email is generated within a few seconds after you submit your request.",
  },
  {
    question: "Is the generated email CAN-SPAM compliant?",
    answer:
      "The HTML template includes placeholder fields for your physical mailing address and an unsubscribe link. Replace those placeholders with your real business information before sending.",
  },
  {
    question: "Do I need email marketing experience to use it?",
    answer:
      "No. You only need to describe the email you want in one sentence. The tool asks follow-up questions when it needs more detail, then generates ready-to-send copy and HTML.",
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
