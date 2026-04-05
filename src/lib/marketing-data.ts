import {
  BarChart3, Users, TrendingUp, Zap, Mail, MessageSquare,
  Shield, Brain, DollarSign, Calculator, FileText, Target,
  Headphones, Globe, PieChart, Building2, UserCheck, Settings,
  Inbox, Bot, LineChart, Receipt, Briefcase, LayoutDashboard,
  Megaphone, Route, CalendarDays, Star, Gauge, BookOpen,
} from "lucide-react"

/* ────────────────────── STATS ────────────────────── */
export const stats = [
  { value: 128, label: "Funksiya", suffix: "+" },
  { value: 16, label: "Da Vinci inteqrasiya", suffix: "" },
  { value: 7, label: "Kommunikasiya kanalı", suffix: "" },
  { value: 500, label: "İstifadəçi şirkət", suffix: "+" },
]

/* ────────────────────── PAIN / SOLUTION ────────────────────── */
export const painPoints = [
  {
    title: "Dağınıq alətlər",
    description: "Satış, marketinq, dəstək və maliyyə üçün 5+ fərqli proqram. Məlumatlar hər yerdə dağınıqdır.",
    icon: Settings,
  },
  {
    title: "Görünməz marja",
    description: "Hansı müştərilərin və xidmətlərin həqiqətən gəlirli olduğunu bilmirsiniz. Gəlir ≠ mənfəət.",
    icon: DollarSign,
  },
  {
    title: "Hər şey əl ilə",
    description: "Məlumat daxiletməsi, təqib və hesabatlara saatlarla vaxt sərf olunur — bunlar avtomatlaşdırılmalıdır.",
    icon: FileText,
  },
]

export const solutions = [
  {
    title: "Vahid platforma",
    description: "CRM, marketinq, dəstək, maliyyə və analitika — hamısı bir yerdə. Daha tab-lar arasında keçid yoxdur.",
    icon: LayoutDashboard,
  },
  {
    title: "Real marjanızı görün",
    description: "Daxili xərc modeli mühərriki hər müştəri, hər xidmət üzrə gəlirliliyi Da Vinci təhlilləri ilə göstərir.",
    icon: PieChart,
  },
  {
    title: "Da Vinci işləyir",
    description: "Daxili Da Vinci agentləri təqibləri, skorinqi, təhlilləri və müştəri xidmətini avtomatik idarə edir.",
    icon: Brain,
  },
]

/* ────────────────────── MODULE SHOWCASE ────────────────────── */
export type ModuleGroup = {
  id: string
  title: string
  icon: typeof BarChart3
  description: string
  features: string[]
  screenshot: string
}

export const moduleGroups: ModuleGroup[] = [
  {
    id: "crm",
    title: "CRM",
    icon: Users,
    description: "Liddən sövdələşmənin bağlanmasına qədər tam satış dövrü idarəsi. Pipeline vizuallaşdırması, sövdələşmə izləməsi və Da Vinci ilə lid skorinqi.",
    features: ["İdarə paneli və KPI-lər", "Şirkətlər və Kontaktlar", "Sövdələşmələr və Pipeline", "Lidlər və Skorinq", "Da Vinci Satış Köməkçisi", "Tapşırıqlar və Təqvim", "Müqavilələr və Fakturalar", "Məhsul kataloqu"],
    screenshot: "/marketing/crm-dashboard.png",
  },
  {
    id: "marketing",
    title: "Marketinq",
    icon: Megaphone,
    description: "Çoxkanallı kampaniya avtomatlaşdırması: marşrut qurucusu, e-poçt ardıcıllıqları və ROI izləməsi.",
    features: ["Kampaniya meneceri", "E-poçt şablonları", "Marşrut qurucusu", "Seqmentlər", "Tədbirlər", "Da Vinci Skorinq", "Da Vinci Kopyraytinq", "Kampaniya ROI"],
    screenshot: "/marketing/marketing-campaigns.png",
  },
  {
    id: "communication",
    title: "Rabitə",
    icon: MessageSquare,
    description: "7 mesajlaşma kanalı bir vahid gələn qutusunda. E-poçt, SMS, Telegram, WhatsApp, Facebook, Instagram, VK.",
    features: ["Vahid gələn qutusu", "E-poçt", "SMS", "Telegram", "WhatsApp", "Facebook və Instagram", "VKontakte"],
    screenshot: "/marketing/inbox-channels.png",
  },
  {
    id: "support",
    title: "Dəstək",
    icon: Headphones,
    description: "SLA tətbiqi, agent iş masası, bilik bazası və müştəri özünə-xidmət portalı ilə tam helpdesk.",
    features: ["Tiket idarəsi", "SLA siyasətləri", "Agent iş masası", "Bilik bazası", "Müştəri portalı", "Portal chat"],
    screenshot: "/marketing/support-tickets.png",
  },
  {
    id: "analytics",
    title: "Analitika",
    icon: LineChart,
    description: "Gəlirlilik mühərriki, büdcələşdirmə və P&L, maliyyə idarəsi, dinamik qiymətləndirmə və Da Vinci hesabatları.",
    features: ["Xərc modeli mühərriki", "Büdcələşdirmə və P&L", "Maliyyə (Debitor, Kreditor, Fondlar)", "Dinamik qiymətləndirmə", "Hesabatlar", "Da Vinci təhlilləri"],
    screenshot: "/marketing/analytics-profitability.png",
  },
  {
    id: "erp",
    title: "ERP",
    icon: Briefcase,
    description: "Mərhələlər, komanda izləməsi, büdcə bölgüsü və tamamlanma analitikası ilə layihə idarəsi.",
    features: ["Layihələr", "Mərhələlər", "Komanda üzvləri", "Büdcə izləməsi", "Tamamlanma %"],
    screenshot: "/marketing/erp-projects.png",
  },
  {
    id: "settings",
    title: "Platforma",
    icon: Settings,
    description: "Korporativ səviyyəli konfiqurasiya: rollar, iş axınları, xüsusi sahələr, audit jurnalları və çox-kirayəçili SaaS arxitekturası.",
    features: ["İstifadəçilər və Rollar", "İş axınları", "Xüsusi sahələr", "Valyutalar", "Audit jurnalı", "Web-to-Lead", "API və Webhooklar"],
    screenshot: "/marketing/platform-settings.png",
  },
]

/* ────────────────────── UNIQUE ADVANTAGES ────────────────────── */
export const advantages = [
  {
    title: "Xərc Modeli Mühərriki",
    description: "Hər müştəri, hər xidmət üzrə gəlirliliyi görün. 18 kateqoriyada qaimə xərclərini izləyin. Da Vinci fəaliyyət planları təklif edir.",
    icon: Calculator,
    color: "#F97316",
    href: "/features/analytics",
  },
  {
    title: "Da Vinci Agent Platforması",
    description: "Daxili Claude inteqrasiyası: hiss təhlili, ağıllı tapşırıqlar, e-poçt yaratma, lid skorinqi və müştəri xidməti. Hər kartın içində — əlavə deyil.",
    icon: Bot,
    color: "#7c3aed",
    href: "/features/ai",
  },
  {
    title: "7 Kanallı Gələn Qutusu",
    description: "E-poçt, SMS, Telegram, WhatsApp, Facebook, Instagram, VK — bütün söhbətlər bir vahid gələn qutusunda.",
    icon: Inbox,
    color: "#f59e0b",
    href: "/features/inbox",
  },
  {
    title: "Dinamik Qiymətləndirmə",
    description: "Şirkətə xüsusi qiymətlər, marja simulyasiyası, xidmət səviyyəli xərc yönləndirməsi. Təklif vermədən əvvəl rəqəmlərinizi bilin.",
    icon: Receipt,
    color: "#ef4444",
    href: "/features/analytics",
  },
]

/* ────────────────────── PRICING PLANS ────────────────────── */
export type PlanTier = {
  id: string
  name: string
  tagline: string
  popular?: boolean
  features: string[]
  /** Total monthly cost in AZN (null = negotiable) */
  price: number | null
  /** Effective per-user price in AZN (null = negotiable) */
  pricePerUser: number | null
  /** Per-user price with annual billing (20% off, null = negotiable) */
  pricePerUserAnnual: number | null
  /** Max users included */
  maxUsers: number | null
}

export const plans: PlanTier[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Kiçik komandalar üçün başlanğıc",
    price: 550,
    pricePerUser: 110,
    pricePerUserAnnual: 88,
    maxUsers: 5,
    features: [
      "Şirkətlər və Kontaktlar",
      "Sövdələşmələr və Pipeline",
      "Lidlər və Skorinq",
      "Tapşırıqlar və Təqvim",
      "Məhsul kataloqu",
      "5 istifadəçiyə qədər",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Böyüyən satış komandaları üçün",
    price: 990,
    pricePerUser: 99,
    pricePerUserAnnual: 79,
    maxUsers: 10,
    features: [
      "Starter-in bütün xüsusiyyətləri",
      "Tiketlər və SLA",
      "Bilik bazası",
      "Müqavilələr",
      "Agent iş masası",
      "Rollar və İcazələr",
      "10 istifadəçiyə qədər",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "Marketinq və satış komandaları üçün",
    popular: true,
    price: 2200,
    pricePerUser: 88,
    pricePerUserAnnual: 70,
    maxUsers: 25,
    features: [
      "Business-in bütün xüsusiyyətləri",
      "Kampaniya avtomatlaşdırması",
      "Marşrut qurucusu",
      "Fakturalar və Təkrarlanan",
      "E-poçt şablonları",
      "Tədbirlər və Seqmentlər",
      "Da Vinci skorinqi",
      "Layihələr və ERP",
      "Hesabatlar",
      "25 istifadəçiyə qədər",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Məlumata əsaslanan təşkilatlar üçün",
    price: 3850,
    pricePerUser: 77,
    pricePerUserAnnual: 62,
    maxUsers: 50,
    features: [
      "Professional-ın bütün xüsusiyyətləri",
      "Xərc modeli və Gəlirlilik",
      "Büdcələşdirmə və P&L",
      "Maliyyə (Debitor, Kreditor, Fondlar)",
      "Dinamik qiymətləndirmə mühərriki",
      "7 kanallı gələn qutusu",
      "Da Vinci Komanda Mərkəzi",
      "Müştəri portalı",
      "Xüsusi sahələr və İş axınları",
      "Audit jurnalı",
      "50 istifadəçiyə qədər",
    ],
  },
  {
    id: "custom",
    name: "Enterprise 50+",
    tagline: "50+ istifadəçi üçün fərdi həll",
    price: null,
    pricePerUser: null,
    pricePerUserAnnual: null,
    maxUsers: null,
    features: [
      "Enterprise-ın bütün xüsusiyyətləri",
      "Fərdi qiymət danışığı",
      "Ayrılmış texniki dəstək",
      "SLA prioritet xidmət",
      "Limitsiz istifadəçi",
    ],
  },
]

/* ────────────────────── TESTIMONIALS ────────────────────── */
export const testimonials = [
  {
    quote: "LeadDrive nəhayət bizə hansı müştərilərin gəlirli, hansıların isə resurslarımızı tükətdiyini göstərdi. Konsaltinq firmamız üçün dönüş nöqtəsi oldu.",
    name: "Elvin Məmmədov",
    title: "Baş Direktor",
    company: "AzərTech Həlləri",
    rating: 5,
  },
  {
    quote: "7 kanallı gələn qutusu bizi WhatsApp, Telegram və e-poçtu ayrı-ayrı idarə etməkdən xilas etdi. Cavab müddətimiz 60% azaldı.",
    name: "Aysəl Həsənova",
    title: "Dəstək rəhbəri",
    company: "BulutKöprü IT",
    rating: 5,
  },
  {
    quote: "Salesforce + HubSpot + P&L izləmə üçün cədvəli bir platforma ilə əvəz etdik. Bir platforma, bir həqiqət mənbəyi.",
    name: "Rüstəm Əliyev",
    title: "Əməliyyat Direktoru",
    company: "DataAxın Agentliyi",
    rating: 5,
  },
  {
    quote: "Da Vinci agenti dəstək tiketlərimizin 40%-ni avtomatik idarə edir. Xərc modeli isə marjalarımızın tam harada olduğunu göstərir.",
    name: "Nigar Kərimova",
    title: "Əməliyyat Meneceri",
    company: "İnnovasiya MSP",
    rating: 5,
  },
  {
    quote: "P&L izləməli büdcələmə modulu — bizə hər zaman lazım olan bu idi. Maliyyə analizi üçün artıq Excel-ə ixrac yoxdur.",
    name: "Fərid Hüseynov",
    title: "Maliyyə Direktoru",
    company: "YaşılTex Xidmətlər",
    rating: 4,
  },
  {
    quote: "Faktura xatırlatmaları üçün marşrut qurucusu gecikmiş ödənişlərimizi 45% azaltdı. Avtomatik təqiblər həqiqətən işləyir.",
    name: "Leyla İbrahimova",
    title: "Maliyyə Meneceri",
    company: "Nexus Konsaltinq",
    rating: 5,
  },
]

/* ────────────────────── FEATURE CARDS (Bento Grid) ────────────────────── */
export type FeatureCard = {
  id: string
  title: string
  description: string
  icon: typeof BarChart3
  features: string[]
  colSpan?: number
}

export const featureCards: FeatureCard[] = [
  {
    id: "crm",
    title: "CRM & Satış",
    description: "Liddən sövdələşmənin bağlanmasına qədər tam satış dövrü. Pipeline, skorinq və tapşırıqlar.",
    icon: Users,
    features: ["Pipeline vizuallaşdırması", "Lid skorinqi (A–F)", "Sövdələşmə izləməsi", "Tapşırıqlar və Təqvim"],
    colSpan: 2,
  },
  {
    id: "marketing",
    title: "Marketinq",
    description: "Kampaniya avtomatlaşdırması, e-poçt ardıcıllıqları və ROI izləməsi.",
    icon: Megaphone,
    features: ["Kampaniya meneceri", "E-poçt şablonları", "Marşrut qurucusu", "Seqmentasiya"],
    colSpan: 1,
  },
  {
    id: "inbox",
    title: "7-Kanal Gələn Qutusu",
    description: "E-poçt, SMS, Telegram, WhatsApp, Facebook, Instagram, VK — vahid qutu.",
    icon: Inbox,
    features: ["Vahid gələn qutusu", "Real-vaxt mesajlaşma", "Da Vinci cavablar"],
    colSpan: 1,
  },
  {
    id: "support",
    title: "Dəstək",
    description: "SLA, tiketlər, bilik bazası və müştəri özünə-xidmət portalı.",
    icon: Headphones,
    features: ["Tiket idarəsi", "SLA siyasətləri", "Bilik bazası"],
    colSpan: 1,
  },
  {
    id: "finance",
    title: "Maliyyə & Analitika",
    description: "Xərc modeli, büdcələşdirmə, P&L və gəlirlilik analizi.",
    icon: LineChart,
    features: ["Xərc modeli mühərriki", "Büdcələşdirmə & P&L", "Dinamik qiymətləndirmə"],
    colSpan: 1,
  },
  {
    id: "ai",
    title: "Da Vinci",
    description: "Daxili Da Vinci: hiss təhlili, lid skorinqi, e-poçt yaratma, avtomatik cavablar və analitika.",
    icon: Bot,
    features: ["Da Vinci lid skorinqi", "Da Vinci e-poçt generasiyası", "Da Vinci müştəri xidməti", "Da Vinci analitika"],
    colSpan: 3,
  },
]

/* ────────────────────── Da Vinci CAPABILITIES ────────────────────── */
export const aiCapabilities = [
  { title: "Avtomatik cavablar", description: "WhatsApp, Telegram və E-poçtda müştəri sorğularına Da Vinci cavab", icon: MessageSquare },
  { title: "Lid skorinqi", description: "Avtomatik A–F dərəcələndirmə və kvalifikasiya", icon: Target },
  { title: "E-poçt generasiyası", description: "Peşəkar mesaj və təklif yaratma — bir kliklə", icon: Mail },
  { title: "Gəlirlilik təhlili", description: "Xərc modelindən avtomatik büdcə və marja hesabatları", icon: LineChart },
  { title: "Bilik bazası", description: "Da Vinci müştəri portalında sualları avtomatik cavablandırır", icon: BookOpen },
]

/* ────────────────────── FAQ ────────────────────── */
export const faqs = [
  {
    q: "Pulsuz sınaq mövcuddur?",
    a: "Bəli! İstənilən planda 14 günlük pulsuz sınaq ilə başlayın. Kredit kartı tələb olunmur.",
  },
  {
    q: "LeadDrive Salesforce və ya HubSpot-dan nə ilə fərqlənir?",
    a: "LeadDrive-da daxili xərc modeli mühərriki, gəlirlilik analitikası və büdcələşdirmə/P&L var — rəqiblərin ya olmayan, ya da əlavə pul tələb etdiyi xüsusiyyətlər. Üstəlik, Da Vinci agentlərimiz daxilidir, əlavə deyil.",
  },
  {
    q: "Mövcud CRM-dən məlumat köçürə bilərəm?",
    a: "Mütləq. CSV/Excel idxalını dəstəkləyirik və populyar CRM-lər üçün miqrasiya skriptlərimiz var. Komandamız mürəkkəb miqrasiyalarda kömək edə bilər.",
  },
  {
    q: "Hansı dillər dəstəklənir?",
    a: "Platforma Azərbaycan, Rus və İngilis dillərini dəstəkləyir. Daha çox dil yol xəritəsindədir.",
  },
  {
    q: "Məlumatlarım təhlükəsizdir?",
    a: "Bəli. Tam şifrələmə ilə PostgreSQL, rol əsaslı giriş nəzarəti, 2FA, audit jurnalı və hər təşkilat üçün tam məlumat izolyasiyası istifadə edirik.",
  },
  {
    q: "CRM-i öz sektoruma uyğunlaşdıra bilərəm?",
    a: "Bəli. Xüsusi sahələr, iş axını avtomatlaşdırması, konfiqurasiya edilə bilən idarə panelləri və dinamik qiymətləndirmə LeadDrive-ı istənilən biznes modelinə uyğunlaşdırmağa imkan verir.",
  },
  {
    q: "Yerli quraşdırma təklif edirsiniz?",
    a: "Hazırda bulud yerləşdirməsi təklif edirik. Enterprise müştərilər üçün yerli quraşdırma variantları mövcuddur — satış komandamızla əlaqə saxlayın.",
  },
  {
    q: "7 kanallı gələn qutusu necə işləyir?",
    a: "E-poçt, SMS, Telegram, WhatsApp, Facebook, Instagram və VK hesablarınızı qoşun. Bütün mesajlar hər kontakt üzrə söhbət silsiləsi ilə bir vahid gələn qutusunda görünür.",
  },
]
