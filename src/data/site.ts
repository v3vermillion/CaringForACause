/**
 * All site content lives in this file.
 *
 * To change dates, programs, links, or contact details, edit the values
 * below. Layout and styling never need to change for routine updates.
 *
 * Values marked `null` are not set up yet. The site hides or falls back
 * gracefully until they are filled in (see README "Launch checklist").
 *
 * Factual claims live in `facts` with their source and status (see facts.ts).
 * When Tamara confirms a detail, change `needsConfirmation(...)` to
 * `orgPublished(...)` or `publicRecord(...)` and update its source.
 */

import {
  claim,
  type Fact,
  needsConfirmation,
  orgPublished,
  pressReported,
  publicRecord,
} from "./facts.ts";

export type YouTubeVideo = {
  /** The ID from the YouTube URL, e.g. youtube.com/watch?v=THIS_PART */
  id: string;
  title: string;
  /**
   * A still from the video or one of her own photos, in src/assets/photos/,
   * shown until someone presses play. Nothing is fetched from YouTube before
   * that, and it must honestly show what plays.
   */
  poster: string;
  /** Which part of the poster to keep in the 16:9 frame, e.g. "center 30%". */
  posterFocus?: string;
};

export type Photo = {
  /** File name in src/assets/photos/ */
  file: string;
  /** Describes what the photo shows, for screen readers. Never name people without permission. */
  alt: string;
  /** Which part of the photo to keep when cropped, e.g. "center 30%". */
  focus?: string;
};

export type Program = {
  /** Used for page anchors, e.g. /#holiday-assistance */
  slug: string;
  name: string;
  /** Three to five words for the program tiles, e.g. "Monthly diapers". */
  label: string;
  /** One sentence shown first. */
  summary: string;
  /** Who the program is for. */
  forWhom: string;
  details?: string[];
  /** Optional grouped checklist, shown in a collapsible section. */
  checklist?: { title: string; groups: { heading: string; items: string[] }[] };
  /** Shown in the program's tile, and beside its text unless a video is set. */
  photo?: Photo;
  /**
   * Until a real photo of the program exists, its strip icon stands in its
   * tile and beside its text, drawn large on the night (decision 90). Never
   * a stock photo, never another program's moment.
   */
  icon?: "meals" | "gifts" | "diapers" | "school";
  /** A click-to-play player takes the photo's place beside the text. */
  video?: YouTubeVideo;
  /** The one next step at the foot of the row, pointing at a place on the site. */
  link?: { label: string; href: string };
  /** Set to false to hide a program without deleting it. */
  active: boolean;
};

export type InvolvementTab = {
  /** Used in links, e.g. /#donate opens the Donate tab. */
  id: "sponsor" | "donate" | "volunteer" | "partner";
  label: string;
  heading: string;
  body: string[];
  /**
   * When `href` is null, the button emails us and shows `fallbackLabel`. A
   * button says what it does: no label promises a form or payment page that
   * isn't there yet (decision 35). Setting the link in `links` flips the label.
   * `emailSubject` is that email's subject, in the sender's words: what lands
   * in her inbox says what the person wants, not the panel's heading
   * ("Partner with us" read as an invitation from them; decision 106).
   */
  action: { label: string; href: string | null; fallbackLabel: string; emailSubject: string };
  photo?: Photo;
};

/**
 * Every factual claim the site makes, with where it came from.
 * Last checked against public sources on September 16, 2026.
 */
export const facts = {
  legalName: publicRecord(
    "Caring for a Cause Supportive Services Inc.",
    "IRS exempt organization records and GuideStar profile, EIN 47-4917287",
  ),
  ein: publicRecord("47-4917287", "GuideStar profile 47-4917287; Charity Navigator"),
  taxExempt: publicRecord(
    { section: "501(c)(3)", deductible: true },
    "IRS exemption data (unconditional exemption, deductible since December 2015), via Gudsy",
  ),
  founded: publicRecord(
    2015,
    "IRS exemption ruling December 2015; her website says the organization was established in 2015",
  ),
  founder: orgPublished(
    "Tamara Long-Ajimati",
    "Her website embeds the Jiffy Lube 'Do More: Tamara Long-Ajimati Provides Supportive Services' video",
  ),
  serviceArea: orgPublished(
    "Central Indiana",
    "caring4acausesupportiveservices.com mission statement",
  ),
  toysForTotsPartner: orgPublished(
    "Toys for Tots",
    "caring4acausesupportiveservices.com, Holiday Assistance section (2025 site)",
  ),
  city: orgPublished(
    "Indianapolis & Noblesville",
    "Indianapolis: her Idealist listing (office on North Meridian Street, associated location Indianapolis), her Holiday Assistance Facebook page, and her 2025-2026 events at an Indianapolis church; Noblesville: the IRS exempt-organization record and GuideStar. Checked October 2026. Never publish the street addresses.",
  ),
  phone: needsConfirmation(
    { display: "(317) 886-0724", href: "tel:+13178860724" },
    "caring4acausesupportiveservices.com; Idealist lists (317) 358-6450",
    "Which phone number should families call?",
  ),
  email: needsConfirmation(
    "caringforacause2015@gmail.com",
    "caring4acausesupportiveservices.com, which also lists Caring4acause2015@gmail.com",
    "Which email address should be public?",
  ),
  facebook: needsConfirmation(
    "https://www.facebook.com/caringforacausesupportiveservices",
    "Current website's Join Us link; directories also list facebook.com/427844620960035",
    "Which Facebook page is current?",
  ),
  familiesHelped: pressReported(
    5000,
    "Jiffy Lube of Indiana, 'Do More: Tamara Long-Ajimati Provides Supportive Services to Indianapolis Families' (June 13, 2023): 'Since 2015, Caring for a Cause has helped over 5,000 families.' A running total, so it stays true; no newer count was found in October 2026.",
  ),
  photoPermission: needsConfirmation(
    "Event photos from the organization's 2021 website, some showing children",
    "caringforacauseindy.netlify.app gallery (originally posted on her Facebook page)",
    "May the new site use these event photos, including the ones that show children?",
  ),
} as const satisfies Record<string, Fact<unknown>>;

/** Names and wording that are the organization's own identity, not claims. */
export const org = {
  name: "Caring for a Cause Supportive Services",
  shortName: "Caring for a Cause",
  mission:
    "We create and manage programs that support the physical and emotional well-being of families in Central Indiana who are facing financial hardship.",
  signOff: "Never give up.",
} as const;

export const links = {
  /** Payment page in her name (e.g. Zeffy). Until set, /donate arranges gifts by email. */
  donate: null as string | null,
  /** Online family application. Until set, families are asked to call or email. */
  familyApplication: null as string | null,
  /** Online sponsor sign-up. Until set, sponsors are asked to call or email. */
  sponsorSignup: null as string | null,
  /** Existing volunteer application (Google Form). */
  volunteerForm: "https://forms.gle/HPL8HgMWvVsk9oAt5",
} as const;

/**
 * The season's one ask, a bar under the program strip. Off (decision 66):
 * the first screen ends with the proof line, on phones too. Set `active`
 * to true to show it again; the first screen makes room for it.
 */
export const seasonalBanner = {
  active: false,
  message: "Families need holiday sponsors for Thanksgiving and Christmas.",
  action: { label: "Sponsor a family", href: "/#sponsor" },
};

/**
 * The welcome shown once, on the first visit to the home page (decision 87).
 * It is addressed to Tamara, so it is built only while the site is a private
 * preview: a public build (PUBLIC_ALLOW_INDEXING=true) leaves it out
 * (decision 88).
 * The words are the owner's gift message, not claims about the organization;
 * "thousands" agrees with the press-reported count of over 5,000 families
 * (decision 79), which About also says as "thousands" (decision 92).
 * Each slide holds its lines on screen for `hold` milliseconds, counted after
 * the slide has faded in: a short slide holds less than a long one. Lines
 * within a slide arrive one after another. `accent` sets a line in the
 * banner's lavender italic; `large` sets a one-line slide in the biggest size.
 */
export const intro = {
  /** localStorage key; once set, the welcome never plays again in that browser. */
  storageKey: "cfac-welcome-seen",
  label: "A thank-you message",
  skip: "Skip",
  slides: [
    { hold: 1400, large: true, lines: [{ text: "Tamara," }] },
    {
      hold: 3200,
      lines: [
        { text: "year after year," },
        { text: "you\u2019ve shown up for thousands of people in need" },
      ],
    },
    {
      hold: 2600,
      lines: [{ text: "So this time," }, { text: "we wanted to show up for you", accent: true }],
    },
    {
      hold: 3200,
      lines: [{ text: "On behalf of every family whose holiday you made brighter..." }],
    },
    { hold: 2000, large: true, lines: [{ text: "thank you!", accent: true }] },
    { hold: 2400, lines: [{ text: "Enjoy your new site :)" }] },
  ],
};

export const hero = {
  /** Her own tagline, from her website. Its one home is the banner's eyebrow, above the headline. */
  tagline: "Together we can.",
  /**
   * The headline is two parts: the lead, in white, and the last line, set in
   * lavender italic on the banner (decision 51). Keep the service area in the
   * accent: it is the one place on the first screen that names it.
   */
  headline: "Holiday meals, gifts, and diapers",
  headlineAccent: "for Central Indiana families.",
  /**
   * Real event photos shown behind the banner, crossfading slowly. Order
   * matters: the first one is what people with reduced motion see. Use
   * photos with faces near the top, since the bottom is covered by text.
   * `focus` is the point kept in frame when the photo is cropped (desktop
   * crops the top and bottom; phones show the full height).
   */
  montage: [
    {
      file: "haircut-boy.jpg",
      alt: "",
      focus: "85% 5%",
    },
    {
      file: "families-banner.jpg",
      alt: "",
      focus: "center 38%",
    },
    {
      file: "holiday-gift-bags.jpg",
      alt: "",
      focus: "center 20%",
    },
    {
      file: "holiday-shopping.jpg",
      alt: "",
      focus: "center 22%",
    },
  ] satisfies Photo[],
  /**
   * What the organization is, from her mission statement. The headline names
   * the service area and the proof line has the year, so neither is repeated.
   */
  subhead: "A nonprofit for households facing financial hardship.",
  /**
   * The two doors. Families first; giving second. They stand alone: the
   * program strip under the banner says what the help is, and the donate
   * page says how giving works (decision 61).
   */
  doors: {
    getHelp: { title: "Help me", href: "/apply/" },
    donate: { title: "Donate", href: "/donate/" },
  },
};

/**
 * The strip under the banner (decision 58): the four things the banner
 * promises, each with its icon from the owner's reference, a title, and the program
 * it opens. Each also has one line, the programs' own words (see
 * `programs`), which the giving page shows beside the same icons; the strip
 * shows the titles alone (decision 66).
 */
export const programStrip = [
  {
    icon: "meals",
    title: "Holiday Meals",
    body: "Food boxes for local families.",
    href: "/#holiday-assistance",
  },
  {
    icon: "gifts",
    title: "Gifts",
    body: "Toys and clothes from a child's wish list.",
    href: "/#holiday-assistance",
  },
  {
    icon: "diapers",
    title: "Diapers",
    body: "A reliable supply, every month.",
    href: "/#diaper-drive",
  },
  {
    icon: "school",
    title: "School Supplies",
    body: "Care packages for the new school year.",
    href: "/#back-to-school",
  },
] as const;

/**
 * Site navigation: one map, four sections. The desktop links and the phone
 * menu share it; the menu adds "Help me" before it and "Donate" after it,
 * and nothing else (decision 38).
 */
export type NavItem = {
  id: string;
  label: string;
  href: string;
};

export const navigation = {
  items: [
    { id: "about", label: "About", href: "/#about" },
    { id: "programs", label: "Programs", href: "/#programs" },
    { id: "involved", label: "Get involved", href: "/#get-involved" },
    { id: "contact", label: "Contact", href: "/#contact" },
  ] satisfies NavItem[],
  donate: { label: "Donate", href: "/donate/" },
  help: { label: "Help me", href: "/apply/" },
};

export const getHelp = {
  heading: "Get help",
  whoCanApply:
    "Households with children and seniors are our focus, but anyone who is struggling right now can apply.",
  howToApply:
    "Prefer to talk to someone first? Call or email us, and we'll send you an application.",
  /** The subject of an email that asks for an application. */
  requestSubject: "Application request",
  /**
   * The aside beside the application form (under it on phones): the call
   * and email buttons under a short heading. The offer itself is said once,
   * in the opener's words above the form (decision 88).
   */
  talk: {
    heading: "Prefer to talk?",
  },
  action: { label: "Start an application", href: "/apply/" },
};

/** The application page (/apply). Field choices live here so they can be edited without touching layout. */
export const applyPage = {
  /** Beside the opener's words on desktop: a family the programs reached. */
  photo: {
    file: "holiday-gift-bags.jpg",
    alt: "Children holding holiday gift bags beside a volunteer in a Santa hat",
    focus: "center 27%",
  } satisfies Photo,
  eyebrow: "Help me",
  heading: "Apply",
  /** The heading's second line, set like the banner's italic accent line. */
  headingAccent: "for help",
  intro:
    "Four short steps. Your answers go straight to us by email, and we'll follow up from there.",
  privacy:
    "Nothing you enter is stored on this website. Your application goes to us by email, and we use it only to arrange help for you.",
  /** Shown when JavaScript is off, since the form can't send without it. */
  noScript: "This form needs JavaScript to send.",
  steps: [
    { id: "you", title: "About you", hint: "How we can reach you" },
    { id: "household", title: "Your household", hint: "Where you live and who lives with you" },
    { id: "needs", title: "What you need", hint: "Choose all that apply" },
    { id: "review", title: "Review and send", hint: "Check your answers" },
  ],
  /** Counties in Central Indiana, for the county picker. */
  counties: [
    "Marion",
    "Hamilton",
    "Hendricks",
    "Johnson",
    "Hancock",
    "Boone",
    "Morgan",
    "Shelby",
    "Madison",
    "Other",
  ],
  contactMethods: ["Call", "Text", "Email"],
  /**
   * The kinds of help a family can ask for, as selectable cards: a title, one
   * line from the program's own words, and which follow-up list opens.
   */
  needs: [
    {
      id: "holiday",
      title: "Holiday meals and gifts",
      line: "Thanksgiving, Christmas, and Easter",
      followUp: "holidays",
    },
    { id: "diapers", title: "Diapers", line: "A reliable monthly supply", followUp: "diaperSizes" },
    {
      id: "school",
      title: "School supplies",
      line: "Supplies and hygiene items for students",
      followUp: "grades",
    },
    {
      id: "haircut",
      title: "Free haircut or style",
      line: "Cuts, styles, and face painting",
      followUp: null,
    },
  ] as const,
  diaperSizes: ["Newborn", "Size 1", "Size 2", "Size 3", "Size 4", "Size 5", "Size 6", "Pull-ups"],
  grades: ["Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  holidays: ["Thanksgiving", "Christmas", "Easter"],
  emailSubject: "Application for help",
  done: {
    heading: "One more step",
    body: "Your email app should have opened with your application filled in. Press Send there and you're done. If nothing opened, copy your application below and paste it into an email to us, or call us.",
  },
};

/** The donation page (/donate). */
export const donatePage = {
  eyebrow: "Donate",
  heading: "Give to families",
  /** The heading's second line, set like the banner's italic accent line. */
  headingAccent: `in ${claim(facts.serviceArea)}`,
  intro:
    "Your donation helps put holiday meals, gifts, diapers, and school supplies into local homes.",
  /** The chooser's heading, over the frequency and amount choices. */
  giftHeading: "Give once or monthly",
  /** The heading over the four programs a gift goes to (programStrip). */
  providesHeading: "What your gift provides",
  amounts: [25, 50, 100, 250],
  frequencies: [
    { id: "once", label: "Once" },
    { id: "monthly", label: "Monthly" },
  ],
  /** Shown while `links.donate` is not set: giving is arranged by email. */
  emailSubject: "Donation",
  /** Every entrance to giving says the same word; only the mechanism differs. */
  continueLabel: "Donate",
  emailLabel: "Donate by email",
  emailNote:
    "We don't accept card payments on this site yet. This button opens an email to us with your gift filled in, and we'll reply with the easiest way to send it.",
};

/** The page shown for an address that doesn't exist. */
export const notFoundPage = {
  eyebrow: "Page not found",
  heading: "We can't find that page",
  body: "The link may be old or mistyped.",
  /** Followed by the phone number as a link. */
  callUs: "If you need help right now, call",
};

export const programs: Program[] = [
  {
    slug: "holiday-assistance",
    name: "Holiday Assistance",
    label: "Thanksgiving, Christmas, Easter",
    summary: "Food boxes and gifts, so every household has a holiday meal and something to open.",
    forWhom: "Low-income families in Central Indiana, especially households with children.",
    details: [
      "Families can receive toys, clothes, gift cards, meals, or gifts from their wish list.",
      "Sponsors choose a family and help fill their holiday needs.",
      "We partner with Toys for Tots.",
    ],
    photo: {
      file: "holiday-mother-child.jpg",
      alt: "A mother with her arm around her young daughter, choosing a toy at a holiday giveaway",
      /* The pair stands in the upper half; the square and 3:2 crops keep both faces. */
      focus: "center 30%",
    },
    link: { label: "Sponsor a family", href: "/#sponsor" },
    active: true,
  },
  {
    slug: "diaper-drive",
    name: "Diaper Drive",
    label: "Diapers every month",
    summary: "A reliable supply, plus referrals to partner resources.",
    forWhom: "Families with babies and toddlers who need help with diapers.",
    photo: {
      file: "diaper-shelves.jpg",
      alt: "The pantry's shelves stacked with packs of diapers, each labelled with the organization's heart",
      focus: "center 50%",
    },
    link: { label: "Partner on the Diaper Drive", href: "/#partner" },
    active: true,
  },
  {
    slug: "back-to-school",
    name: "Back-to-School Care Packages",
    label: "Hygiene and school supplies",
    summary: "Hygiene items and school supplies for girls and boys in our community.",
    forWhom: "Students from families who need help getting ready for school.",
    /* No photo of this program exists in her albums (decision 90). This
       one is the site's single stock photo, a one-time exception the owner
       made (decision 104): real supplies in a real room, no people, under
       the free Unsplash License (Laura Rivera, unsplash.com/photos/
       ArH3dtoDQc0). A care-package photo from Tamara replaces it. */
    photo: {
      file: "school-supplies.jpg",
      alt: "Buckets of colored pencils, school scissors, pencils and highlighters on a shelf",
      focus: "center 45%",
    },
    checklist: {
      title: "See what we're collecting",
      groups: [
        {
          heading: "Hygiene",
          items: [
            "Shampoo",
            "Conditioner",
            "Toothpaste",
            "Dental floss",
            "Fold-up toothbrush",
            "Breath strips",
            "Mouthwash",
            "Small first aid kit",
            "Travel-size sewing kit",
            "Deodorant",
            "Travel soap or body wash",
            "Body spray",
            "Lotion",
            "Lip balm",
            "Hair bands",
            "Hand sanitizer",
            "Box of tissues",
          ],
        },
        {
          heading: "School supplies",
          items: [
            "Notebooks",
            "Wide-ruled notebook",
            "#2 pencils",
            "Colored pencils",
            "Pencil sharpeners",
            "Erasers",
            "Pencil case",
            "Glue sticks",
            "Crayons",
            "Washable markers",
            "Watercolor paints (8 count)",
            "Blunt-tip scissors",
            "Pocket folders",
            "Construction paper",
            "Lunchbox",
            "Backpack",
          ],
        },
      ],
    },
    active: true,
  },
  {
    slug: "haircuts",
    name: "Free Haircuts & Styles",
    label: "Cuts, styles, face painting",
    summary:
      "Volunteer barbers and stylists cut and style hair at our outreach events; makeup artists and face painters join them.",
    forWhom: "People experiencing homelessness and low-income families.",
    photo: {
      file: "haircut-boy.jpg",
      alt: "A boy gets a free haircut from a volunteer stylist",
      focus: "center 30%",
    },
    video: {
      id: "Z5USx1xFF58",
      title: "Free haircuts and styles outreach program",
      poster: "stylist-haircut.jpg",
      posterFocus: "center 27%",
    },
    // To the Partner panel, which is where barbers, stylists, makeup artists
    // and face painters are asked; "Volunteer" opened a panel named Partner.
    link: { label: "Offer your skills at a haircut event", href: "/#partner" },
    active: true,
  },
  {
    slug: "bikes",
    name: "Free Bike Program",
    label: "Bikes for kids",
    summary: "Listed on the 2021 site. Hidden until Tamara confirms it is still running.",
    forWhom: "To confirm.",
    active: false,
  },
];

export const getInvolved = {
  heading: "Four ways to help",
  intro: "Choose how you'd like to help.",
  tabs: [
    {
      id: "sponsor",
      label: "Sponsor a family",
      heading: "Sponsor a family for the holidays",
      body: [
        "Sponsors provide a family with gifts from their wish list, a holiday meal, or both.",
        "You may sponsor one family or several, for a single holiday or for all three.",
      ],
      action: {
        label: "Sign up to sponsor",
        href: links.sponsorSignup,
        fallbackLabel: "Email us to sponsor",
        emailSubject: "Sponsoring a family for the holidays",
      },
      photo: {
        file: "gift-boy.jpg",
        alt: "A young boy grins as he holds up the superhero toy he chose at a holiday giveaway",
        /* His face sits a third of the way down; the 3:2 panel crop keeps head and toy. */
        focus: "center 32%",
      },
    },
    {
      id: "donate",
      label: "Donate",
      heading: "Make a donation",
      /** The short version: /donate is the destination, so this says one thing and hands off. */
      body: [
        "Give once or monthly. Your donation helps provide holiday meals, gifts, diapers, and school supplies for local families.",
      ],
      action: {
        label: "Donate",
        href: "/donate/",
        fallbackLabel: "Donate",
        emailSubject: donatePage.emailSubject,
      },
      /* What a gift turns into: a Thanksgiving basket in the cart, turkey and
         sides, no faces. The panel's copy names holiday meals first. */
      photo: {
        file: "holiday-basket-cart.jpg",
        alt: "A shopping cart filled with a Thanksgiving meal for one family: a turkey, vegetables, potatoes and sides",
        focus: "center 50%",
      },
    },
    {
      id: "volunteer",
      label: "Volunteer",
      heading: "Volunteer your time",
      /** Her website: "We have amazing part-time volunteers that are committed to helping others. We are always looking for more help." */
      body: [
        "Our part-time volunteers are committed to helping others, and we're always looking for more.",
      ],
      action: {
        label: "Fill out the volunteer form",
        href: links.volunteerForm,
        fallbackLabel: "Email us to volunteer",
        emailSubject: "Volunteering",
      },
      photo: {
        file: "volunteer-face-painting.jpg",
        alt: "A volunteer styles a girl's hair at a community event",
        focus: "center 8%",
      },
    },
    {
      id: "partner",
      label: "Partner",
      heading: "Partner with us",
      body: [
        "Businesses and organizations can support the Diaper Drive and our holiday programs.",
        "Barbers, stylists, makeup artists, and face painters can donate their time at our haircut events.",
      ],
      action: {
        label: "Contact us about partnering",
        href: null,
        fallbackLabel: "Email us to partner",
        emailSubject: "Partnership inquiry",
      },
      photo: {
        file: "stylist-haircut.jpg",
        alt: "A volunteer stylist cuts a man's hair at a free haircut event",
        focus: "center 32%",
      },
    },
  ] satisfies InvolvementTab[],
};

export const about = {
  eyebrow: "About",
  heading: `Meet ${claim(facts.founder)}`,
  body: [
    `${claim(facts.founder).split(" ")[0]} founded ${org.shortName} in ${claim(facts.founded)} to support families in ${claim(facts.serviceArea)} who are facing financial hardship. Year after year since then, she and her volunteers have helped thousands of families.`,
    // "Thousands", not the press-reported 5,000 (decision 79): that count is
    // from 2023 and the owner believes the true one is well above it, so the
    // page claims only what the record supports (decision 92). "She and her
    // volunteers" is the organization, which is volunteer-run.
    // Her website's "Our History": grown thanks to the community's helping
    // hands. (Her volunteers, "committed to helping others", are the
    // Volunteer panel's words; said here too, the page said it twice.)
    "The organization has grown thanks to the helping hands of this community.",
  ],
  /** A still from her "Do More" feature, cropped to leave out the program's caption. */
  portrait: {
    file: "tamara-portrait.jpg",
    alt: `${claim(facts.founder)}, founder of ${org.shortName}, smiling outside in a red top`,
    focus: "left 25%",
  } satisfies Photo,
  watchLabel: "Watch her story",
  video: {
    id: "7smWzJwY9kA",
    // The video's published title, quoted exactly (YouTube oEmbed, October 2026).
    title: "Tamara Long-Ajimati Provides Supportive Services to Indianapolis Families",
    poster: "tamara-portrait.jpg",
    posterFocus: "center 25%",
  } satisfies YouTubeVideo,
};

/**
 * The gallery's opener: label and heading (decision 94). No lede: the photos
 * are directly below and say it themselves (decision 97).
 */
export const gallerySection = {
  eyebrow: "Gallery",
  heading: "Moments from our programs",
};

/** Photos from src/assets/photos/ shown in the gallery strip. Fewer than four hides the section. */
export const gallery: Photo[] = [
  {
    file: "easter-volunteer.jpg",
    alt: "A volunteer in scrubs smiles in the street with two wrapped Easter baskets",
    focus: "center 30%",
  },
  {
    file: "toy-tables.jpg",
    alt: "Tables of new toys sorted by age for the holiday giveaway, with a Toys for Tots sign",
    focus: "center 45%",
  },
  {
    file: "diaper-pantry.jpg",
    alt: "The founder in a Diaper Drive shirt beside the pantry's shelves of diapers",
    focus: "center 40%",
  },
  {
    file: "diaper-drive.jpg",
    alt: "A volunteer hands a large pack of diapers to a family with a young child",
    focus: "center 20%",
  },
  {
    file: "easter-trunk.jpg",
    alt: "A car's open trunk filled with wrapped Easter baskets ready to deliver",
    focus: "center 50%",
  },
  {
    file: "face-paint-tiger.jpg",
    alt: "A child with half his face painted as a tiger at a community event",
    focus: "center 30%",
  },
  {
    file: "toy-tables-little-ones.jpg",
    alt: "A table of toys for babies and toddlers at the holiday giveaway",
    focus: "center 45%",
  },
  {
    file: "easter-doorway.jpg",
    alt: "A volunteer in a doorway holding wrapped Easter baskets",
    focus: "center 35%",
  },
  {
    file: "holiday-dinner.jpg",
    alt: "Families eat a holiday dinner at long tables while others browse the toy tables behind them",
    focus: "center 55%",
  },
  {
    file: "holiday-cooks.jpg",
    alt: "Four volunteer cooks behind trays of hot food at the holiday dinner, the organization's banner beside them",
    focus: "center 40%",
  },
  {
    file: "family-embrace.jpg",
    alt: "A father hugs his five children, all holding bags of gifts, outside the winter distribution",
    focus: "center 45%",
  },
  {
    file: "serving-line.jpg",
    alt: "A volunteer serves hot food while a child carries her plate to the table",
    focus: "center 45%",
  },
  {
    file: "volunteers-winter.jpg",
    alt: "Three volunteers in winter coats and Santa headbands smile outside the distribution",
    focus: "center 35%",
  },
];
