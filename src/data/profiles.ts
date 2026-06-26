import type { OrgEdits, Person } from './types'
import { profilePhotoSrc } from './sharedStore'

/** A photo with an optional caption (gallery / inline images). */
export interface ProfilePhoto {
  /** Local asset path under /public, e.g. '/profiles/wondo-1.jpg'. */
  src: string
  caption?: string
}

/** A designer's "human" profile, scraped once from the team's Notion
 *  "About Us – designers" space and baked in as local data + assets. Everything
 *  beyond `names`/`emoji` is optional so partial profiles degrade gracefully. */
export interface Profile {
  /** Org-chart names this profile matches (exact, normalised). Use FULL names —
   *  first names alone collide (e.g. Darren Yeo vs Darren Lee). */
  names: string[]
  /** The Notion page icon, e.g. '🐧'. */
  emoji: string
  /** Notion "Job title" (Design lead / Design Manager / Designer). */
  jobTitle?: string
  /** Main profile photo, e.g. '/profiles/wondo.jpg'. */
  photo?: string
  /** An optional image the person attached to "how I'd describe myself". */
  personalityImage?: string

  // Rich "about me" sections (each a list of short lines, author's wording).
  personality?: string[]
  askMeAbout?: string[]
  workingStyle?: string[]
  communicationStyle?: string[]
  role?: string[]
  responsibilities?: string[]
  successLooksLike?: string[]
  supportNeeded?: string[]
  petPeeves?: string[]
  otherCommitments?: string[]

  /** Extra photos the person shared (with captions). */
  gallery?: ProfilePhoto[]

  // Notion database facts.
  specialisedIn?: string[]
  contributions?: string[]
  /** ISO date the person joined, e.g. '2025-02-03'. */
  joined?: string
  email?: string
  linkedin?: string
  portfolio?: string
}

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Baked-in designer profiles (scraped from Notion — not a live connection).
 * To refresh: re-run the Notion scrape and replace this array + /public/profiles.
 */
export const PROFILES: Profile[] = [
  {
    names: ['Wondo Jeong', 'Wondo'],
    emoji: '🐧',
    jobTitle: 'Design lead',
    photo: '/profiles/wondo.jpg',
    askMeAbout: [
      'Interaction design (e.g. Interaction model, product strategy)',
      'Soju-bomb',
      'Wooden chopping board',
      'Aurora chasing',
      'Italian gestures',
    ],
    workingStyle: [
      'Not really structured (I want to improve this) — leaning on Linear to do better',
      'Act first (with just enough data / instinct) → I might need your help if you think it’s too rushed.',
      'Between designers and builders, I love bouncing ideas',
      'I want to achieve tangible outcomes after discussions',
    ],
    communicationStyle: [
      'I am a visual person. Prefer to have / create visuals to communicate properly',
      'I am a good listener, professionally and personally. Please use my super power.',
      'Love honest and transparent feedback. Feedback is about the work or product. Not about me or you.',
      'I tend to double check my understandings (that helps others to articulate better, too)',
      'Communication protocol matters. No WhatsApp for work, Slack for mostly (but let’s expect we don’t check Slack all the time) and use other tools like Linear / Figma comment for task-specific comms',
    ],
    role: ['Design lead'],
    responsibilities: [
      'Quality of craft (for MOE’s digital products) — DLS, visual design and foundational design',
      'Design Ops — making a “safe” place for designers, a delightful culture / workplace, design team scale-up strategy',
      'Design lead for two products — Onward (hackathon incubation proj) and SE Connect',
      'Keep the momentum of the new org',
    ],
    successLooksLike: [
      'The design team enjoys working at the division',
      'The team can design / build product faster but in high quality (this is not impossible)',
      'The product we design brings the impact',
      'I can keep learning new things while working — WoW (ways of working), tools and people.',
    ],
    supportNeeded: [
      'Honest feedback and opinions on my design',
      'Business viability and technical feasibility advice',
      'Acknowledgements / reactions',
      'Correction on my tones — I try but sometimes I speak with a lack of the subtle nuance',
    ],
    petPeeves: [
      'No Hello plz. Just state what you need :)',
      'Let’s appreciate each other’s time',
      'Please don’t be too protective. Let’s be constructive.',
      'Bureaucracy',
    ],
    otherCommitments: [
      'I will be wearing double hats between Onward and SE Connect.',
      'I am doing a part-time visual designer role for our division branding',
      'We are the only family in Singapore. I wish my 7–9pm and weekends are protected to dedicate to my family. (Of course, I’m expecting a few dynamic days! haha)',
    ],
    gallery: [
      { src: '/profiles/wondo-1.jpg', caption: 'Failed 3 times. Succeeded in hunting the Northern light finally.' },
      { src: '/profiles/wondo-2.jpg', caption: 'When you finish bottles of Soju, you become Thanos' },
      { src: '/profiles/wondo-3.jpg', caption: 'A memory from Italy — after a big project, the ex-boss showed his appreciation (silly but respectful)' },
    ],
    specialisedIn: ['Interaction design', 'Product strategy'],
    contributions: ['SEconnect', 'Division branding', 'onward incubation', 'Interactive Digital Textbook'],
    joined: '2025-02-03',
    email: 'wondo_jeong@moe.gov.sg',
    linkedin: 'https://www.linkedin.com/in/wondojeong/',
    portfolio: 'wondojeong.com',
  },
  {
    names: ['Darren Yeo'],
    emoji: '🐬',
    jobTitle: 'Design Manager',
    photo: '/profiles/darren.jpg',
    personalityImage: '/profiles/darren-personality.jpg',
    personality: [
      '(can explain during our intro session) 3 things about me:',
      '1. You may think I’m a fish, and that is okay!',
      '2. I can be really abstract and silly!',
      '3. Trying to be sociable!',
      '“So long, and thanks for all the fish!”',
      'And I toggle between INFJ and INFP',
    ],
    askMeAbout: [
      'Space opera',
      'Geeky design stuff',
      'Christianity',
      'Design management and how to thrive in the corporate environment',
      'A bit about everything UX',
    ],
    workingStyle: [
      'I am at my personal best at 8.30–10am. This is my focused work.',
      'I am at my lowest at 5pm. Don’t bring difficult problems at this time. Brainless admin task is still possible!',
      'Timeboxing is super important to me. I want to arrive on time, I want to end on time.',
      'I tend to ask questions so that I can understand better. I rely on well-designed systems to self-direct outcomes. I’d rather not direct actions unless I have to — instead, I want to know what’s blocking you from succeeding at your work.',
    ],
    communicationStyle: [
      'I like to be near a whiteboard when there are complex problems or discussions.',
      'Slack me for straightforward items. Call me if it’s urgent. Have a meeting if it’s important.',
      'I can read raw, rough and ready materials. Please don’t over-document unless you are 80% sure it’s a no-regret move.',
      'Give me a heads-up when you can, but I can adapt on the spot too.',
      'At times, let’s do things slightly differently. Go for a walk or drive. Have lunch. Do a personal journey map. Paint our feedback. Build with Lego and plasticine. Let’s have deep fun at work.',
    ],
    role: [
      'Managing ESTL’s UXD — better designers, better design',
      'Contribute to MOE’s UX vision and strategy',
      'Waymaker — ways to measure impact and increase the team’s velocity and interaction with minimal effort',
      'Admin warrior… unblock to free up time for designers',
      'UX spokesperson — a bridge between senior non-design stakeholders and us, making them fall in love with UX and the problem.',
    ],
    responsibilities: [
      'ESTL’s UXD',
      'ESTL’s portfolio with UXD in them (and more)',
      'MOE’s Design Practice',
      'MOE’s UXD (tbc)',
    ],
    successLooksLike: [
      'Measuring UX impact',
      'Improve team health',
      'Increasing velocity in our product delivery and design practice',
      'Fewer meetings, better outcomes',
      'Consistently better UX',
    ],
    supportNeeded: [
      'Shared accountability',
      'Reverse mentoring… mentor me too!',
      'Remind me to pause or have fun! There can be a lot of context switching in my work',
    ],
    petPeeves: [
      'UX = UI at a different level. I’m interested in a broad topic of design.',
      'When a scheduled message is an option, but is not used.',
    ],
    otherCommitments: [
      'Family commitments, but things are getting better',
      'Thursday afternoons (for now from May to July) where I commit myself externally',
      'Managing and prioritising what are CCAs and what will be beneficial for myself or my team',
    ],
    specialisedIn: ['Product strategy', 'UX research', 'UX design', 'DesignOps'],
    contributions: ['UX Management'],
    joined: '2025-03-03',
    email: 'darren_yeo@moe.gov.sg',
    linkedin: 'https://www.linkedin.com/in/darrenyeo/',
    portfolio: 'https://medium.com/@breathingdesign',
  },
  {
    names: ['Emily Ong'],
    emoji: '🌻',
    jobTitle: 'Design lead',
    photo: '/profiles/emily.jpg',
    personality: [
      'Sunflower – need lots of sun and being outdoors',
      'Introvert – quiet “me” time before I face the world',
      'Emergenetics – Structured + Social',
      'ISFJ',
    ],
    askMeAbout: [
      'Good eats',
      'Words and writing',
      'Communication design',
      'Human behaviour and psychology',
      'Space planning, interior styling, decluttering',
    ],
    workingStyle: [
      'Morning person',
      'Focus work in the mornings',
      'Meetings in the afternoons',
      'Planned meetings > spontaneous discussions',
    ],
    communicationStyle: [
      'Quick clarifications: Slack me!',
      'Discussions: book my time earlier with a clear agenda so I’m able to prep beforehand',
      'Time-boxed focused discussions over long-drawn unstructured ones',
      'Feedback substantiated with evidence',
    ],
    role: ['Product Designer'],
    responsibilities: ['User research', 'Content design', 'Interaction design'],
    successLooksLike: [
      'A seamless and useful journey for our users to facilitate their decision making',
      'Clear and helpful copy just-in-time',
      'Stakeholders recognising the value of design to bring transformation',
    ],
    supportNeeded: [
      'Time to explore, ideate, iterate',
      'Recognition and appreciation for a job well done',
      'Safe space for open communication',
      'Teamwork: building on each other’s ideas and working together for the best outcome',
    ],
    petPeeves: ['Negativity', 'Fixed mindsets and an inability to accept suggestions / feedback'],
    otherCommitments: ['Work-life balance is important to me so evenings are reserved for family time'],
    specialisedIn: ['UX research', 'UX writing'],
    contributions: ['Parents Gateway', 'Flexilist', 'Connecto-gram', 'OnePlacement'],
    joined: '2020-06-15',
    email: 'emilyong@estl.sg',
    linkedin: 'https://www.linkedin.com/in/emilyongcc/',
  },
  {
    names: ['Vienna Neo'],
    emoji: '🌶️',
    jobTitle: 'Designer',
    photo: '/profiles/vienna.jpg',
    personality: [
      'INFJ',
      'INFJs are diligent and meticulous workers who believe in doing the right thing, always keeping integrity at the forefront. They carry a sense of personal accountability for the tasks entrusted to them, enabling them to consistently deliver high-quality work. Although they tend to be well-liked among their colleagues, INFJ personalities are still Introverts — from time to time, they may need to step back and work alone. This isn’t a sign of resentment or ill will, but rather a signal of INFJs’ need to balance serving others with their own self-care.',
    ],
    askMeAbout: [
      'Pottery',
      'Reality shows',
      'House hunting',
      'National parks',
      'Gymming',
      'Pilates',
      'Your experience with Parents Gateway',
      'Lightweight animation',
    ],
    workingStyle: [
      'I am more productive alone but I like having dedicated time for physical collaboration.',
      'I enjoy working closely with other designers as the feedback we can give each other is very valuable.',
    ],
    communicationStyle: [
      'I prefer spontaneous and informal feedback sessions, as they keep the iterative process quick and dynamic. But I also appreciate structured feedback when focusing on specific areas that require deeper discussion or refinement.',
    ],
    role: ['UX Designer'],
    responsibilities: ['The design of Parents Gateway as a whole'],
    successLooksLike: ['Delighted users + satisfied stakeholders + me being proud of what I have produced'],
    supportNeeded: [
      'I’m always looking to user-test my designs! If you’re open to participating — or even better, if you know people who use Parents Gateway — I’d love to build a close-knit community for candid sharing and early guerrilla testing (#friendsofparentsgateway).',
      'Not stretched too thin and being able to focus on specific items.',
    ],
    petPeeves: ['When someone Slacks me “hello” and leaves it at that. It makes me anxious. XD'],
    otherCommitments: [
      'I sometimes feel like there are endless events 😅 As a designer in PG, I’m part of multiple communities — the ESTL UX designer community, the DCUBE designer community, the MOE designer community, the broader GovTech designer community, plus ESTL, MOE ITD, DCUBE, and GovTech. On top of that, I’m also a TAP alumni. Each group hosts events through the year, and sometimes we’re even involved in organising them.',
    ],
    specialisedIn: ['UX design', 'UI design', 'UX research'],
    contributions: ['Parents Gateway', 'OneSchoolBus', 'Flexilist'],
    joined: '2025-02-03',
    email: 'vienna_neo@moe.gov.sg',
    linkedin: 'https://sg.linkedin.com/in/viennaneo',
  },
  {
    names: ['Lay Hui Tan', 'Lay Hui'],
    emoji: '🔆',
    jobTitle: 'Designer',
    photo: '/profiles/layhui.jpg',
    personalityImage: '/profiles/layhui-personality.jpg',
    personality: ['Donut lamp, INFJ'],
    askMeAbout: ['Books!', 'Bouldering', 'Cafes', 'Photography', 'Product psychology', 'UX writing'],
    workingStyle: [
      'It’s important to me to have quiet focus time to prepare, study, and execute. I enjoy being in a flow state, so I tend to work uninterrupted in 2-hour intervals — typically during WFH days, and discuss during WFO days.',
      'For discussion and brainstorming — f2f or remote (Slack huddle, Teams call, Figma call etc. all good!).',
      'I tend to weigh the pros and cons / think about tradeoffs to make a decision',
    ],
    communicationStyle: [
      'Preparation time is preferred if the discussion topic requires more study and thought.',
      'I’m good with spontaneous discussions too; if more thinking is required, we can always schedule a follow-up.',
      'Acknowledgement is appreciated!',
      'If it can be done asynchronously effectively (comments, Slack, ticket), that mode of feedback is preferred!',
    ],
    role: ['UX designer'],
    responsibilities: ['UX research and testing', 'Wireframe and prototype (Figma)', 'UX writing'],
    successLooksLike: [
      '[SDT] Enhance SDT and onboard more users.',
      '[MOE] Familiarise with the education problem space, existing solutions, and people',
      '[UX] Grow in my knowledge and application of product psychology',
    ],
    supportNeeded: ['Feedback', 'Openness in discussing different POVs, considerations, and tradeoffs', 'Knowledge sharing'],
    petPeeves: ['Discussions / meetings that lack agenda or focus'],
    otherCommitments: ['Not too sure exactly which product I will be working on; currently only SDT'],
    specialisedIn: ['UX design', 'UI design', 'UX writing'],
    contributions: ['SDT'],
    joined: '2022-07-08',
    email: 'tan_lay_hui@tech.gov.sg',
    linkedin: 'https://www.linkedin.com/in/lay-hui-tan-uxdesigner',
  },
  {
    names: ['Elky Li', 'Elky'],
    emoji: '🤡',
    jobTitle: 'Designer',
    photo: '/profiles/elky.jpg',
    personalityImage: '/profiles/elky-personality.jpg',
    askMeAbout: [
      'Design systems? Accessibility? Still learning these and hoping to learn more from others! 📚',
      'Sewing 🧵',
      'DIY home 🔧',
      'Recipes 🔥',
      'Random TikTok videos 📱',
    ],
    workingStyle: [
      'Enjoy dedicated “alone time” as most days are filled with meetings and WFO 🪫 — hiding behind the desk or playing brainless mobile games during lunch to recharge',
      'Most productive at midnight when there are minimal distractions — out of sight, out of mind 🦉',
      'Appreciate having clear objectives while having the autonomy to explore solutions',
    ],
    communicationStyle: [
      'During discussions, value having space to process my thoughts before responding 🌀',
      'Prefer face-to-face, spontaneous feedback for clarification and to prevent misunderstandings 🤝',
    ],
    role: ['UX designer 🎨'],
    responsibilities: ['OnePlacement and MOE DS initiative'],
    successLooksLike: ['When users can complete the tasks they want to do and the product / feature brings value to their lives 💯'],
    supportNeeded: [
      'Context switching is harder than I thought — there are often many thoughts “dancing” in my brain at once, so I value dedicated time where I can deep-dive into a task without interruptions',
    ],
    petPeeves: [
      'Unproductive + overrunning meeting combo 🤯',
      'Typos, even though my English isn’t that great 🔤',
      'Prefer to jump in when I have something to add rather than being put on the spot',
    ],
    otherCommitments: ['Not a commitment but — work-life balance after 6pm 🕕🏃‍♀️💨'],
    specialisedIn: ['UX design', 'UI design'],
    contributions: ['OnePlacement', 'MOE DS', 'Parents Gateway', 'Individualised Student Timetable'],
    joined: '2025-02-03',
    email: 'elky_li@moe.gov.sg',
  },
  {
    names: ['Grace Marie Chan', 'Grace'],
    emoji: '🐶',
    jobTitle: 'Designer',
    photo: '/profiles/grace.jpg',
    personality: ['Chaotic neutral'],
    askMeAbout: [
      'My dog, or pet ownership in general',
      'Local recommended food spots / bakeries',
      'Pet-friendly food spots or events',
      'Competitive eating (I don’t do it but I watch them!)',
      'Dungeons and Dragons',
      'Gym / strength training',
      'User interview adventures',
    ],
    workingStyle: [
      'I am a morning person and find myself most productive in the day.',
      'I think and work faster on my own, so I try to block out time in the morning or afternoon to focus.',
      'That said, I enjoy collaboration — it helps me sharpen ideas. I get easily distracted so I really need to isolate myself to get things done (AKA I’ll end up over-chatting with people in the office 😅)',
      'I like autonomy but with some direction — just point me toward the goal and we’ll take it from there.',
      'I usually reach out when I need help, but I also appreciate when people check in or offer support along the way.',
    ],
    communicationStyle: [
      'I prefer to get feedback physically and am comfortable with on-the-spot discussions. But I tend to process things more deeply afterwards, so I may revisit discussions with after-thoughts.',
      'For everything else (questions / help), I can be easily reached via Slack!',
    ],
    role: ['Product Designer'],
    responsibilities: [
      'User and discovery research',
      'Designing user flows and interfaces',
      'Wireframes and prototypes',
      'Usability testing',
      'Copy and UX writing',
      'Workshop facilitation',
      'Making slides look good and vetting EDMs (while educating that this is not exactly the role of a UXD 😞)',
      'Coming soon: defining and implementing UX-related metrics, mascot creation / branding, design system contribution',
    ],
    successLooksLike: [
      'I’m big on user validation — success means actually solving user pain points. Fewer complaints or negative feedback is a strong signal for me.',
      'Being able to look back and feel proud of what’s been built with the team, and the journey we took together.',
    ],
    supportNeeded: [
      'Space to experiment and explore ideas / methods / process / tools with the freedom to fail and learn along the way',
      'Constructive feedback',
      'Clear direction or goals',
      'Collaborative culture to share ideas or challenges',
    ],
    petPeeves: [
      '🚨 Physical meetings on non-office days — I usually reserve those for deep work.',
      'Meetings that expect my input without prior notice or an agenda — I need time to prepare and contribute meaningfully.',
    ],
    otherCommitments: [
      'None at the moment, but I shall not jinx it.',
      'Usually other CCAs / function group matters — it really varies throughout the year.',
      'If anything comes up… it shall be known ⚠️',
    ],
    specialisedIn: ['UX design', 'UI design', 'UX research'],
    contributions: ['Parents Gateway', 'OneSchoolBus', 'All Ears'],
    joined: '2020-08-30',
    email: 'grace_marie_chan@moe.gov.sg',
  },
  {
    names: ['Jordyn Khoo', 'Jordyn'],
    emoji: '🥐',
    jobTitle: 'Designer',
    photo: '/profiles/jordyn.jpg',
    personality: [
      'INFP, Gemini',
      'INFPs are idealistic, deeply thoughtful, and driven by their values — creative and introspective, often seeking meaning in their work and relationships. Empathetic and open-minded, they’re passionate about helping others but also need personal space to recharge. They prefer authenticity over superficiality and may struggle with rigid structure or routine.',
      'Emergenetics profile: conceptual and structured',
      'If I were something, I could be an everfresh plant — opens up in the day but closes up at night (morning person, need alone time to recharge); floats in the wind (in my own world sometimes)',
    ],
    askMeAbout: [
      'As at 18 Mar 2025: how to pour latte art ☕️ help',
      'All things art and design — painting, homewares, furniture, well-designed physical products etc.',
      'Working out / mid-to-long distance runs 🏃🏻‍♀️',
      'General wellbeing, mindfulness 🧘🏻‍♀️',
      'Baking bread, pastries',
      'Psychology / behavioural-science-y stuff',
    ],
    workingStyle: [
      'It depends — mostly a morning person, but sometimes late night when it’s quiet',
      'Prefer a 70:30 mix of individual deep work and collaboration time',
      'I prefer the autonomy to explore within a structured framework — clear goals to achieve, with freedom to explore solutions to reach them',
    ],
    communicationStyle: [
      'Prefer timely feedback rather than waiting for appraisal season',
      'No strong preference on how to receive constructive feedback — in person is always better imo, but timeliness matters most to me',
      'Direct, well-meaning and constructive',
    ],
    role: ['UX Designer for All Ears and the MOE Design System initiative'],
    responsibilities: ['Improving the experience of All Ears and building the MOE design system'],
    successLooksLike: [
      'All Ears: the go-to product for all forms / survey related tasks in MOE',
      'All Ears: good user feedback + improvement in measurable outcomes, and pride in the work',
      'Design system: adoption, with happy product teams + happy end users',
    ],
    supportNeeded: [
      'Like an everfresh, if conditions are ideal, I grow quickly 🌱',
      'Constructive yet honest, direct feedback',
      'Collaborative, supportive and committed team',
      'Clear product vision and purpose (need to know the whys)',
      'Expertise and guidance in conducting more creative design experiments',
    ],
    petPeeves: ['When people ask me about something without giving any context'],
    otherCommitments: [
      'ESTL folks have functions which take up some time outside our core job scope',
      'For me, it’s the people group / wellbeing — planning cohesion activities (2–3 times a year), huddle games, monthly birthday celebrations',
      'SOS has a suite of products; things may come in whenever',
    ],
    specialisedIn: ['UX research', 'UX design', 'UI design'],
    contributions: ['Parents Gateway', 'All Ears', 'Student Details Form', 'MOE DS', 'SEconnect'],
    joined: '2025-02-03',
    email: 'jordyn_khoo@moe.gov.sg',
    linkedin: 'linkedin.com/in/jordynkhoo',
  },
  {
    names: ['Jordan Chong', 'Jordan'],
    emoji: '💧',
    jobTitle: 'Designer',
    photo: '/profiles/jordan.jpg',
    personalityImage: '/profiles/jordan-personality.jpg',
    personality: [
      'Water — “be like water” (Bruce Lee). I embrace that change is the only constant, and feel quite jaded if nothing has changed in my life after a few months.',
      'Emergenetics – Conceptual and Analytical',
      'Gallup top strengths — Learner, Relator, Achiever, Harmony, Individualisation',
    ],
    askMeAbout: [
      'Helping people spend more time building and enjoying than wondering and worrying as they age — resistance training, habit building, personal development and motivation',
      'Systems thinking — ecosystem stuff',
      'Philosophy about life',
      'Growth mindset',
      'Books I read / listen to',
    ],
    workingStyle: [
      'Morning person — 5am for priming, reflection, gratitude and planning ahead',
      'Focus on the most important and high-value work in the morning (still practising this without distraction)',
      'Clear admin or check emails after 4pm — brain just needs a break to do something simple',
      'Prefer time-boxing and working on it to prevent overthinking',
      'Prefer to communicate more frequently to get clarity of roles and deliverables amid a chaotic environment',
    ],
    communicationStyle: [
      'Slack me for quick stuff, but don’t expect me to monitor it — I switch off notifications and check during breaks (every 30–60 min)',
      'Email responses are typically 1 day or more',
      'Welcome to drop by and say hi, or ask something not work-related to show you care about me as a person more than my work',
      'Prefer in-person / virtual 1:1s as a way to reflect, bounce ideas and exchange creatively',
      'Call me directly if you need my immediate help',
    ],
    role: [
      'UX Designer for School Operating System, MIMS Student Login, MIMS Staff Login',
      'UX community connector — an introvert who wishes to connect with like-minded people',
      'Design Ops optimiser — try to buy back our time through automation or simplification',
    ],
    responsibilities: [
      'From discovery research and stakeholder engagement to creating human-centric experiences for people',
      'Thinking ahead about how to leverage Design Practice for consistently good UX design in MOE',
    ],
    successLooksLike: [
      'Ability to generate more value for the people I care about',
      'Ability to learn, do and reflect every day',
      'A better person compared to x months ago',
    ],
    supportNeeded: [
      'Prioritisation of work, articulation of values and meaning of work',
      'Understand the why, and leave the “how” to me and my peers',
      'An environment that is brutally honest and grows together by learning from our past adventures',
    ],
    petPeeves: [
      'Toxic mindset — fixed mindset, selfish behaviour, sabotaging',
      'Indecision on what’s the highest priority',
      'Non-meaningful work or activities',
    ],
    otherCommitments: [
      'Comms and marketing work (CCA)',
      'Design community (as volunteer)',
      'Commitment to do meaningful work (could affect the less meaningful work assigned to me 😣)',
    ],
    contributions: ['All Ears', 'MIMS Student/Staff Login', 'SEconnect', 'OnePlacement'],
    joined: '2020-10-20',
    email: 'chong_ying_leong@moe.gov.sg',
    linkedin: 'www.linkedin.com/in/jordanchongyl',
  },
  {
    names: ['Shaina'],
    emoji: '🐈',
    jobTitle: 'Designer',
    photo: '/profiles/shaina.jpeg',
    personalityImage: '/profiles/shaina-personality.webp',
    personality: [
      'A liquid cat',
      'Why? Curious, like to try new things, fascinated by new experiences',
      'Fluid, open-minded, open to taking new forms with new spaces and people',
      'Like looking for and playing with new ways to interact with and discover the world',
      'Independent, like pursuing my personal growth quietly and steadily',
      'I like spotting new flora 🌻 and fungi 🍄 on my way out from home, especially the tiny grass flowers! A quiet way to appreciate the small details I’d otherwise overlook.',
    ],
    askMeAbout: [
      'I actually really enjoy listening — but if you want, I’m happy to talk about things I’m trying to grow better at: climbing, snowboarding, diving',
    ],
    workingStyle: [
      'Autonomy and flexibility matter to me — I need protected time and space to do my work. Office days for syncs and discussions, home days for getting work done. Urgent ad-hoc discussions over calls!',
      'Prefer to focus on the big picture and ensure alignment on broad understandings before diving into details — specifics can come once the foundation is set',
      'Collaborative! I like getting input and meaningful perspectives, and co-creating solutions',
      'I believe a culture of trust is very important for a team to be successful',
    ],
    communicationStyle: [
      'I appreciate clear, direct communication and value transparency over vague or indirect responses. State the main point clearly — it keeps things focused.',
      'Honesty should always be paired with respect and consideration — especially tact and kindness when delivering feedback.',
      'I ask questions to understand more deeply, and try to do it nicely so people don’t feel challenged — but if it’s too much, let me know.',
      'For discussions I prefer structure and agendas (even mental ones) so we stay focused and grounded on a goal — not talking in circles.',
      'I prefer concrete, tangible, actionable ideas over overly conceptual / abstract ones.',
    ],
    role: ['UX Designer!', 'And for our previous product (Kaki) I filled the role of a product manager'],
    responsibilities: [
      'Organising and planning UX activities for our team — plans, approaches, delivery timelines, and deliverables',
      'Delivering key UX outputs such as guides, templates, wireframes, branding, and presentations',
      'Collaborating with business owners and stakeholders through updates, presentations, alignment meetings, and gathering insights',
    ],
    successLooksLike: [
      'Recognising and supporting the strengths of my teammates, and supporting others in their gaps — helping people grow and growing alongside them',
      'Moving people towards a common goal and purpose, uniting differences, creating an environment where diverse perspectives strengthen the team',
    ],
    supportNeeded: [
      'I value principles and broad frameworks over rigid / arbitrary rules. I need a clear understanding of the “why” behind decisions — “just because” isn’t sufficient. There needs to be meaningful reasoning.',
      'Overarching structures so the team knows the boundary lines and our collective mandate, but with room to push them and explore new possibilities within that framework',
      'My weaknesses: very tiny details, visual design, UI :(, pixel-perfect execution',
    ],
    petPeeves: [
      'Inflexibility, rigidity, and meaningless rules and red tape',
      'Mindless execution, and decisions / actions taken without consideration and thought',
      'Pessimism, negativity, cynicism',
      'Discussions that have no goal, going round in circles',
    ],
    otherCommitments: ['None, but I try to keep a good balance between work and my personal commitments!'],
    gallery: [
      { src: '/profiles/shaina-1.jpeg' },
      { src: '/profiles/shaina-2.jpeg' },
      { src: '/profiles/shaina-3.jpeg' },
      { src: '/profiles/shaina-4.jpeg' },
      { src: '/profiles/shaina-5.jpeg' },
      { src: '/profiles/shaina-6.jpeg' },
      { src: '/profiles/shaina-7.jpeg' },
      { src: '/profiles/shaina-8.jpeg' },
    ],
    specialisedIn: ['Product strategy', 'UX design', 'UX research'],
    contributions: ['SDT'],
    joined: '2025-02-03',
    email: 'shaina.govtech@gmail.com',
  },
  {
    names: ['Ying Tong'],
    emoji: '☕',
    jobTitle: 'Designer',
    personality: [
      'INFP, Mediator',
      'INFP (Mediator) — Introverted, Intuitive, Feeling, Prospecting. Tends to be quiet, open-minded, and imaginative, applying a caring and creative approach to everything.',
    ],
    askMeAbout: ['Animation', 'Entertainment (games, movies, dramas)', 'Exercise', 'Travel', 'Food', 'Music'],
    workingStyle: [
      '40 alone : 60 collaboration',
      'Prefer guidance with set goals, and freedom to fail and explore within projects',
    ],
    communicationStyle: [
      'Spontaneous discussions to spark creativity and collaboration',
      'Heart-to-heart talks for deeper conversations',
    ],
    role: ['UX Designer'],
    responsibilities: ['OnePlacement design and research'],
    successLooksLike: ['When users are able to make an informed decision and complete their transactions'],
    supportNeeded: ['To be given the appropriate space to focus on delivery'],
    petPeeves: ['Meetings without agendas'],
    specialisedIn: ['UX design', 'UI design', 'UX research'],
    contributions: ['OnePlacement'],
    joined: '2024-02-05',
    email: 'yingtong_@hotmail.com',
  },
]

const BY_NAME: Map<string, Profile> = (() => {
  const m = new Map<string, Profile>()
  for (const profile of PROFILES) {
    for (const n of profile.names) m.set(norm(n), profile)
  }
  return m
})()

/** The baked (Notion-scraped) profile for a person, matched by normalised name. */
export function getBakedProfile(person: Pick<Person, 'name'>): Profile | undefined {
  return BY_NAME.get(norm(person.name))
}

/**
 * The profile to display, merging the baked data with any in-app edit.
 *
 * When a person has an override it is the full source of truth for their text
 * (the edit form is pre-filled from the baked data, so nothing is lost on first
 * save). The photo is resolved from its marker: a custom upload → the photo
 * endpoint URL; '' → no photo; absent → the baked photo. Gallery + the inline
 * personality image aren't editable in-app yet, so they stay from the baked data.
 */
export function getEffectiveProfile(
  person: Pick<Person, 'name'>,
  edits: Pick<OrgEdits, 'profiles'> | undefined,
): Profile | undefined {
  const baked = getBakedProfile(person)
  const ov = edits?.profiles?.[person.name]
  if (!ov) return baked
  const photo =
    ov.photo === 'custom'
      ? profilePhotoSrc(person.name, ov.photoV)
      : ov.photo === ''
        ? undefined
        : baked?.photo
  return {
    names: baked?.names ?? [],
    emoji: ov.emoji ?? baked?.emoji ?? '',
    jobTitle: ov.jobTitle,
    photo,
    personalityImage: baked?.personalityImage,
    personality: ov.personality,
    askMeAbout: ov.askMeAbout,
    workingStyle: ov.workingStyle,
    communicationStyle: ov.communicationStyle,
    role: ov.role,
    responsibilities: ov.responsibilities,
    successLooksLike: ov.successLooksLike,
    supportNeeded: ov.supportNeeded,
    petPeeves: ov.petPeeves,
    otherCommitments: ov.otherCommitments,
    gallery: baked?.gallery,
    specialisedIn: ov.specialisedIn,
    contributions: ov.contributions,
    joined: ov.joined,
    email: ov.email,
    linkedin: ov.linkedin,
    portfolio: ov.portfolio,
  }
}
