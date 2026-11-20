// Edit this file with your own details. Everything on the page comes from here.

export const profile = {
  name: "Frederick Thorpe",
  title: "Software Architect",
  location: "Denver, CO",
  summary:
    "Software architect and senior engineer who designs and ships web, mobile, and cloud systems for healthcare, e-commerce, federal accessibility, and infrastructure clients. Recent work spans React frontends, GraphQL and NestJS services, and platforms on AWS, GCP, and Azure.",
  links: [
    { label: "ketuark@gmail.com", href: "mailto:ketuark@gmail.com" },
  ],
};

export interface Job {
  company: string;
  role: string;
  start: string;
  end: string;
  bullets: string[];
}

export const experience: Job[] = [
  {
    company: "Comp Sci LLC · Remote",
    role: "Senior Engineer",
    start: "Apr 2025",
    end: "Present",
    bullets: [
      "Contracting with an eyecare company to design and develop a modern e-commerce platform from inception, including cart and checkout, orders and returns, and a virtual glasses try-on.",
      "Leading frontend architecture and responsive UI across mobile, tablet, and desktop (React, Vite, Okta, Stripe).",
    ],
  },
  {
    company: "Digimarc · Remote",
    role: "Senior Engineer",
    start: "Apr 2024",
    end: "Feb 2025",
    bullets: [
      "Owned major features of Illuminate, the application customers use to watermark product packaging and images and track an item’s lifecycle through QR codes and digital watermarks (React, GCP, GraphQL, Node.js).",
      "Used GCP workflows and task queues to create and store millions of serials at a time, improving performance of the legacy system by 50%.",
      "Added flags to serials so a scanned QR code or watermark redirects the end user to a URL chosen by that flag.",
    ],
  },
  {
    company: "Blubyrd · Remote",
    role: "Senior Engineer / Team Lead",
    start: "Mar 2023",
    end: "Mar 2024",
    bullets: [
      "Led the engineering team building Blubyrd, a healthcare platform for communication with providers and EHR integrations (NestJS, React, GraphQL, EventStore).",
      "Planned and built new features with design and product.",
      "Set application patterns for other engineers, wrote stories, reviewed merge requests, and gave feedback to support career growth.",
    ],
  },
  {
    company: "Slalom Build · Denver, CO",
    role: "Software Architect",
    start: "Nov 2018",
    end: "Mar 2023",
    bullets: [
      "Delivered five enterprise applications to production for large companies.",
      "Worked with clients to gather requirements, scope the work, and choose the approach for each project’s roadmap.",
      "Ran events, mentored and interviewed interns, and led clubs.",
    ],
  },
  {
    company: "L3 Technologies · Greenville, TX",
    role: "Software Engineer",
    start: "Jul 2017",
    end: "Oct 2018",
    bullets: [
      "Built a license management system from scratch to track which users hold a license and for how long (MySQL, Python).",
      "Wrote bash scripts to automate operating-system kickstart and the programs that run at startup (Bash, Red Hat Linux).",
    ],
  },
  {
    company: "Lovelace Technologies · Fayetteville, AR",
    role: "Co-Founder",
    start: "Oct 2016",
    end: "Aug 2017",
    bullets: [
      "Won the McMillon Design Hackathon, then co-founded the company to keep building the product for Tyson: a real-time dashboard that tracks industrial barcode scanners and notifies a manager when any are missing, using SendGrid and Twilio for email and SMS (AngularJS, MongoDB, Node.js, Express).",
    ],
  },
];

export const skills: { group: string; items: string[] }[] = [
  {
    group: "Languages",
    items: ["GraphQL", "Go", "Java", "Kotlin", "Python", "SQL", "NoSQL", "Bash"],
  },
  {
    group: "Frontend",
    items: ["React", "Next.js", "AngularJS", "Vite"],
  },
  {
    group: "Backend",
    items: ["NestJS", "Node.js"],
  },
  {
    group: "Platforms",
    items: ["AWS", "GCP", "Azure", "Terraform"],
  },
  {
    group: "Practice",
    items: [
      "Microservice design",
      "Database design",
      "Object-oriented programming",
      "Agile",
      "Full-stack development",
      "Mobile development",
      "Mentorship",
      "Leadership",
    ],
  },
  {
    group: "Tools",
    items: [
      "SendGrid",
      "Twilio",
      "EventStoreDB",
      "Auth0",
      "Okta",
      "Stripe",
      "FHIR7 APIs",
      "Sentry",
      "Firebase",
      "Pendo",
      "Git",
      "Oso",
    ],
  },
];

export const projects: { name: string; description: string; href?: string }[] = [
  {
    name: "BARD",
    description:
      "Braille Audio and Reading Download, a federal audiobook library for blind and low-vision users. Fully server-rendered, with a strong accessibility focus. The frontend uses a builder pattern for advanced search and a backend-for-frontend to serve diverse APIs and mobile views (Next.js, React, AWS, Python Lambda APIs). Built at Slalom.",
  },
  {
    name: "Deer hunting mobile app",
    description:
      "Ionic app that ports to native iOS and Android (AngularJS, Capacitor, AWS, Firebase). Built at Slalom.",
  },
  {
    name: "Network orchestration system",
    description:
      "Platform for reserving bandwidth that connects on-prem networks to Azure, AWS, and GCP, replacing a legacy system so the process finishes in a fraction of the time (Go, Terraform, Azure). Built at Slalom.",
  },
  {
    name: "Customer service dashboard",
    description:
      "Dashboard built on an internal component library and configuration-driven data, so new customer types can be added without a rewrite (React, Kotlin, Spring Boot). Built at Slalom.",
  },
  {
    name: "Tyson scanner dashboard",
    description:
      "Real-time dashboard that tracks industrial barcode scanners and alerts a manager when any are missing, with email and SMS through SendGrid and Twilio (AngularJS, MongoDB, Node.js, Express). Started after winning the McMillon Design Hackathon.",
  },
  {
    name: "This website",
    description:
      "React and TypeScript frontend, Express API on Lambda, Cognito sign-in, and DynamoDB, deployed with Terraform.",
  },
];

export const education: { school: string; credential: string; year: string }[] = [
  { school: "University of Arkansas", credential: "B.S. Computer Science", year: "2017" },
];
