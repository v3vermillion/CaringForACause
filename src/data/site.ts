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

import { claim, type Fact, needsConfirmation, orgPublished, publicRecord } from "./facts.ts";

export type YouTubeVideo = {
  /** The ID from the YouTube URL, e.g. youtube.com/watch?v=THIS_PART */
  id: string;
  title: string;
  /**
   * Optional thumbnail file in src/assets/photos/. Self-hosting it means the
   * page makes no request to YouTube until someone presses play.
   */
  poster?: string;
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
  /** Shown beside the text. When a photo is set, a video becomes a text link. */
  photo?: Photo;
  video?: YouTubeVideo;
  /** Set to false to hide a program without deleting it. */
  active: boolean;
};

export type InvolvementTab = {
  /** Used in links, e.g. /#donate opens the Donate tab. */
  id: "sponsor" | "donate" | "volunteer" | "partner";
  label: string;
  heading: string;
  body: string[];
  /** When `href` is null, the button emails us and shows `fallbackLabel`. */
  action: { label: string; href: string | null; fallbackLabel: string };
  photo?: Photo;
  video?: YouTubeVideo;
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
  city: needsConfirmation(
    "Noblesville, Indiana",
    "GuideStar and directory listings; the 2021 site lists an Indianapolis office",
    "Is the organization based in Noblesville, Indianapolis, or both?",
  ),
  phone: needsConfirmation(
    { display: "(317) 886-0724", href: "tel:+13178860724" },
    "caring4acausesupportiveservices.com; Idealist lists (317) 358-6450",
    "Which phone number should families call?",
  ),
  email: needsConfirmation(
    "Caringforacause2015@gmail.com",
    "caring4acausesupportiveservices.com, which also lists Caring4acause2015@gmail.com",
    "Which email address should be public?",
  ),
  facebook: needsConfirmation(
    "https://www.facebook.com/caringforacausesupportiveservices",
    "Current website's Join Us link; directories also list facebook.com/427844620960035",
    "Which Facebook page is current?",
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
  /** Free donation page in her name (e.g. Zeffy). Until set, Donate opens the Donate tab. */
  donate: null as string | null,
  /** Online family application. Until set, families are asked to call or email. */
  familyApplication: null as string | null,
  /** Online sponsor sign-up. Until set, sponsors are asked to call or email. */
  sponsorSignup: null as string | null,
  /** Existing volunteer application (Google Form). */
  volunteerForm: "https://forms.gle/HPL8HgMWvVsk9oAt5",
} as const;

/** The strip under the hero. Change each season, or set `active: false`. */
export const seasonalBanner = {
  active: true,
  message: "Holiday sponsors are needed for Thanksgiving and Christmas.",
  action: { label: "Sponsor a family", href: "/#sponsor" },
};

export const hero = {
  headline: "Holiday meals, gifts, and diapers for Central Indiana families",
  /**
   * Real event photos shown behind the headline, crossfading slowly. Order
   * matters: the first one is what people with reduced motion see. Use
   * photos with faces near the top, since the bottom is covered by text.
   */
  montage: [
    {
      file: "holiday-gift-bags.jpg",
      alt: "",
      focus: "center 22%",
    },
    {
      file: "haircut-boy.jpg",
      alt: "",
      focus: "center 20%",
    },
    {
      file: "families-banner.jpg",
      alt: "",
      focus: "center 30%",
    },
    {
      file: "holiday-shopping.jpg",
      alt: "",
      focus: "center 30%",
    },
  ] satisfies Photo[],
  subhead: `A volunteer-run nonprofit helping families in ${claim(facts.serviceArea)} since ${claim(facts.founded)}.`,
  doors: {
    getHelp: {
      title: "Help me",
      body: "Holiday meals and gifts, monthly diapers, and school supplies.",
      href: "/#get-help",
    },
    giveHelp: {
      title: "I want to help",
      body: "Sponsor a family, donate, or volunteer your time.",
      href: "/#get-involved",
    },
  },
};

export const getHelp = {
  heading: "Get help",
  whoCanApply:
    "Households with children and seniors are our focus, but anyone who is struggling right now can apply.",
  howToApply:
    "Call or email us to request an application. We'll send you the application and more information.",
};

export const programs: Program[] = [
  {
    slug: "holiday-assistance",
    name: "Holiday Assistance",
    label: "Thanksgiving, Christmas, Easter",
    summary:
      "Food boxes and gifts for families at Thanksgiving, Christmas, and Easter, so every household has a meal and something to open.",
    forWhom: "Low-income families in Central Indiana, especially households with children.",
    details: [
      "Families can receive toys, clothes, gift cards, meals, or gifts from their wish list.",
      "Sponsors choose a family and help fill its holiday needs.",
      "We partner with Toys for Tots.",
    ],
    photo: {
      file: "holiday-gift-bags.jpg",
      alt: "Children holding holiday gift bags beside a volunteer in a Santa hat",
      focus: "center 62%",
    },
    active: true,
  },
  {
    slug: "diaper-drive",
    name: "Diaper Drive",
    label: "Diapers every month",
    summary: "A reliable monthly supply of diapers, plus referrals to partner resources.",
    forWhom: "Families with babies and toddlers who need help with diapers.",
    photo: {
      file: "diaper-drive.jpg",
      alt: "A volunteer hands a large pack of diapers to a family with a young child",
      focus: "center 40%",
    },
    active: true,
  },
  {
    slug: "back-to-school",
    name: "Back-to-School Care Packages",
    label: "Hygiene and school supplies",
    summary: "Hygiene items and school supplies for girls and boys in our community.",
    forWhom: "Students from families who need help getting ready for school.",
    photo: {
      file: "care-basket.jpg",
      alt: "A woman carries a basket filled with care package items",
      focus: "center 50%",
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
      "Volunteer barbers, stylists, makeup artists, and face painters give free cuts and styles.",
    forWhom: "People experiencing homelessness and low-income families.",
    photo: {
      file: "haircut-boy.jpg",
      alt: "A boy gets a free haircut from a volunteer stylist",
      focus: "center 30%",
    },
    video: { id: "Z5USx1xFF58", title: "Free haircut and styles outreach program" },
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
  heading: "Get involved",
  intro: "Choose how you'd like to help.",
  tabs: [
    {
      id: "sponsor",
      label: "Sponsor a family",
      heading: "Sponsor a family for the holidays",
      body: [
        "Sponsors help a family with gifts from their wish list, a holiday meal, or both.",
        "You can sponsor one family or several, for one holiday or all three.",
      ],
      action: {
        label: "Sign up to sponsor",
        href: links.sponsorSignup,
        fallbackLabel: "Email us to sponsor",
      },
      photo: {
        file: "holiday-shopping.jpg",
        alt: "Children holding shopping bags during a holiday shopping trip",
        focus: "center 60%",
      },
      video: { id: "02gc0dPLET0", title: "Holiday sponsors and volunteers needed" },
    },
    {
      id: "donate",
      label: "Donate",
      heading: "Donate money or items",
      body: [
        "Donations help provide diapers, holiday meals, gifts, and school supplies for local families.",
        `${claim(facts.legalName)} is a ${claim(facts.taxExempt).section} nonprofit (EIN ${claim(facts.ein)}), so donations are tax-deductible.`,
      ],
      action: { label: "Donate now", href: links.donate, fallbackLabel: "Email us to give" },
      photo: {
        file: "families-banner.jpg",
        alt: "Families and children in front of a Caring for a Cause banner",
        focus: "center 55%",
      },
      video: { id: "xUVUOB-w94Q", title: "Donations and volunteers needed" },
    },
    {
      id: "volunteer",
      label: "Volunteer",
      heading: "Volunteer your time",
      body: [
        "Our part-time volunteers are committed to helping others, and we're always looking for more help.",
      ],
      action: {
        label: "Fill out the volunteer form",
        href: links.volunteerForm,
        fallbackLabel: "Email us to volunteer",
      },
      photo: {
        file: "volunteer-face-painting.jpg",
        alt: "A volunteer paints a girl's face at a community event",
        focus: "center 40%",
      },
    },
    {
      id: "partner",
      label: "Partner",
      heading: "Partner with us",
      body: [
        "Businesses and organizations can partner with us on the Diaper Drive and holiday programs.",
        "Barbers, stylists, makeup artists, and face painters can donate their time at our haircut events.",
      ],
      action: {
        label: "Contact us about partnering",
        href: null,
        fallbackLabel: "Email us about partnering",
      },
      photo: {
        file: "stylist-haircut.jpg",
        alt: "A volunteer stylist cuts a man's hair at a free haircut event",
        focus: "center 40%",
      },
    },
  ] satisfies InvolvementTab[],
};

export const about = {
  heading: `Meet ${claim(facts.founder)}`,
  body: [
    `${claim(facts.founder)} founded ${org.shortName} in ${claim(facts.founded)} to support families in ${claim(facts.serviceArea)} who are facing financial hardship.`,
    "Part-time volunteers help run every program, and the organization has grown thanks to the helping hands of this community.",
  ],
  video: {
    id: "7smWzJwY9kA",
    title: "Do More: Tamara Long-Ajimati provides supportive services to families in need",
    poster: "video-do-more-poster.jpg",
  } satisfies YouTubeVideo,
};

/** Photos from src/assets/photos/ shown in the gallery strip. Empty hides the section. */
export const gallery: Photo[] = [
  {
    file: "face-paint-closeup.jpg",
    alt: "A child with a colorful painted face at a community event",
    focus: "center 35%",
  },
];
