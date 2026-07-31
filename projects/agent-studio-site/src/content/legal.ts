/**
 * Legal page content.
 *
 * ⚠️ TEMPLATE CONTENT — NOT LEGAL ADVICE, NOT REVIEWED BY COUNSEL.
 *
 * These are structurally complete drafts covering the sections an enterprise
 * buyer's procurement and security review will actually look for. They are
 * written to be edited by a lawyer, not to be published as-is. Placeholders in
 * [SQUARE BRACKETS] are facts only the client knows — company registration,
 * hosting regions, retention periods, subprocessor list.
 *
 * The security page matters commercially: enterprise buyers ask for a DPA and
 * a subprocessor list early, and not having one visible stalls deals.
 */

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  slug: 'privacy' | 'terms' | 'security';
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
}

const UPDATED = '2026-07-31';

export const LEGAL_DOCS: Record<LegalDoc['slug'], LegalDoc> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy policy',
    summary:
      'What personal data we collect, why, how long we keep it, and the rights you have over it.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Who we are',
        body: [
          'AI Agent Studio ([REGISTERED COMPANY NAME], company number [NUMBER], registered at [ADDRESS]) is the data controller for personal data described in this policy.',
          'For questions about this policy or to exercise any right described below, contact [PRIVACY CONTACT EMAIL].',
        ],
      },
      {
        heading: 'What we collect',
        body: [
          'Information you give us: your name, work email, company, and anything you write in a contact or scoping form.',
          'Information we collect automatically: pages visited, approximate location derived from IP address, and device and browser type. We do not use advertising trackers or sell data to third parties.',
          'Customer data processed by agents: where an agent processes data on your behalf, we act as a processor, not a controller. That relationship is governed by the Data Processing Agreement rather than this policy.',
        ],
      },
      {
        heading: 'Why we process it',
        body: [
          'To respond to enquiries and provide services you have asked for — the lawful basis is performance of a contract or steps taken at your request.',
          'To operate and improve the site — the lawful basis is legitimate interest, balanced against your rights.',
          'To meet legal and accounting obligations — the lawful basis is legal obligation.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'Enquiry data: [RETENTION PERIOD] from last contact.',
          'Customer records: for the life of the contract plus [RETENTION PERIOD] to meet accounting requirements.',
          'Analytics data: [RETENTION PERIOD], in aggregate form thereafter.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You can ask for a copy of your data, ask us to correct or delete it, object to processing, or ask us to restrict it. Write to [PRIVACY CONTACT EMAIL] and we will respond within one month.',
          'If you are unhappy with our response you can complain to your local supervisory authority. In the UK that is the Information Commissioner’s Office.',
        ],
      },
    ],
  },

  terms: {
    slug: 'terms',
    title: 'Terms of service',
    summary: 'The agreement between you and us when you use this site or buy an agent.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Agreement',
        body: [
          'These terms apply when you use this website or purchase any agent, agent team, or custom build. Where a signed order form or master services agreement exists, that document takes precedence over these terms.',
        ],
      },
      {
        heading: 'What we provide',
        body: [
          'Pre-built agents are provided on a subscription basis, configured for your environment during setup.',
          'Custom builds are delivered against a written scope agreed in advance. Changes to that scope are agreed in writing and may affect price and timeline.',
          'Agent teams are provided as an ongoing service including the workflow configuration and review gates described in your order form.',
        ],
      },
      {
        heading: 'Your responsibilities',
        body: [
          'You are responsible for the accuracy of data you connect an agent to, and for having the right to process that data.',
          'You must not use an agent to break the law, to make automated decisions with legal effect on an individual without human review, or in a way that breaches a third party’s rights.',
          'Human oversight remains yours. Agents draft, route, and reconcile; where an output has consequences for a person, a human approves it.',
        ],
      },
      {
        heading: 'Fees and cancellation',
        body: [
          'Subscription fees are billed [BILLING FREQUENCY] in advance. Usage above the included volume is billed in arrears at cost plus the margin stated on your order form.',
          'You may cancel a subscription with [NOTICE PERIOD] notice, effective at the end of the current billing period. Custom build fees already incurred are non-refundable.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'Nothing in these terms limits liability for death or personal injury caused by negligence, fraud, or anything else that cannot be limited by law.',
          'Subject to that, our total liability is capped at [CAP — TYPICALLY FEES PAID IN THE PRECEDING 12 MONTHS], and we are not liable for indirect or consequential loss, or loss of profit, revenue, or data.',
        ],
      },
      {
        heading: 'Governing law',
        body: [
          'These terms are governed by the laws of [JURISDICTION], and the courts of [JURISDICTION] have exclusive jurisdiction.',
        ],
      },
    ],
  },

  security: {
    slug: 'security',
    title: 'Security & data processing',
    summary:
      'How we secure data, who we share it with, and the DPA terms that apply when an agent processes data on your behalf.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Our role',
        body: [
          'When an agent processes data on your behalf, you are the controller and we are the processor. We process personal data only on your documented instructions.',
          'A Data Processing Agreement is available at [DPA LINK OR CONTACT], and forms part of your contract.',
        ],
      },
      {
        heading: 'Security measures',
        body: [
          'Data in transit is encrypted with TLS 1.2 or above. Data at rest is encrypted using [ENCRYPTION STANDARD].',
          'Access to customer data is limited to staff who need it, granted through single sign-on with multi-factor authentication, and reviewed [REVIEW FREQUENCY].',
          'Changes to production systems require review by a second person and are logged.',
          'We run [PENETRATION TEST FREQUENCY] penetration tests. A summary report is available under NDA.',
        ],
      },
      {
        heading: 'Model providers and subprocessors',
        body: [
          'Agents call third-party model providers to do their work. The current subprocessor list, including each provider, its purpose, and its processing region, is maintained at [SUBPROCESSOR LIST LINK].',
          'We give [NOTICE PERIOD] notice before adding or replacing a subprocessor, and you may object.',
          'Where a provider offers a zero-retention or no-training configuration, we use it by default. [CONFIRM PER PROVIDER.]',
        ],
      },
      {
        heading: 'Data location and transfers',
        body: [
          'Customer data is stored in [HOSTING REGION]. Where processing involves a transfer outside [REGION], it is covered by [TRANSFER MECHANISM — e.g. UK IDTA / EU SCCs].',
        ],
      },
      {
        heading: 'Incidents',
        body: [
          'We will notify you without undue delay and within [NOTIFICATION WINDOW] of becoming aware of a personal data breach affecting your data, with the information you need to meet your own reporting obligations.',
          'Report a suspected vulnerability to [SECURITY CONTACT EMAIL]. We will acknowledge within [ACKNOWLEDGEMENT WINDOW].',
        ],
      },
      {
        heading: 'Deletion and return',
        body: [
          'On termination we return or delete customer data within [DELETION WINDOW], at your choice, except where law requires retention. Backups are purged on their normal cycle of [BACKUP CYCLE].',
        ],
      },
    ],
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS) as LegalDoc['slug'][];
