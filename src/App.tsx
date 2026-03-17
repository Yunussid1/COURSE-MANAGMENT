import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Role = "admin";

type AdminUser = {
  username: string;
  password: string;
  role: Role;
};

type ClassItem = {
  id: string;
  name: string;
  note: string;
};

type BundleItemType = "book" | "notebook" | "stationery" | "other" | "annualCharge";
type ExtraInventoryCategory = Exclude<BundleItemType, "book">;

type CourseBundle = {
  id: string;
  name: string;
  schoolName: string;
  note: string;
  createdAt: string;
};

type CourseBundleItem = {
  id: string;
  courseId: string;
  productId: string;
  itemType: BundleItemType;
  itemName: string;
  quantity: number;
  price: number;
  classId: string;
  subject: string;
  createdAt: string;
};

type EffectiveCourseBundleItem = CourseBundleItem & {
  autoLinked?: boolean;
};

type Book = {
  id: string;
  name: string;
  classId: string;
  courseId: string;
  subject: string;
  authorPublisher: string;
  price: number;
  stock: number;
};

type ExtraInventoryItem = {
  id: string;
  category: ExtraInventoryCategory;
  name: string;
  price: number;
  stock: number;
  note: string;
};

type InvoiceDraftItem = {
  id: string;
  entryMode: "manual-book" | "bundle-item";
  itemType: BundleItemType;
  bookId: string;
  courseId: string;
  classId: string;
  itemName: string;
  subject: string;
  quantity: number;
  price: number;
};

type InvoiceLine = {
  id: string;
  bookId: string;
  itemType: BundleItemType;
  itemName: string;
  courseName: string;
  className: string;
  subject: string;
  quantity: number;
  price: number;
  lineTotal: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  dueDate: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  items: InvoiceLine[];
};

type Settings = {
  businessName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  upiId: string;
  thankYouNote: string;
  accentColor: string;
  logoDataUrl: string;
  lowStockThreshold: number;
};

type SchoolWorkspace = {
  id: string;
  name: string;
  note: string;
  createdAt: string;
};

type Tab = "dashboard" | "inventory" | "classes" | "courses" | "billing" | "sales" | "settings";

const STORAGE_KEYS = {
  users: "central_books_users",
  token: "central_books_token",
  schoolWorkspaces: "central_books_school_workspaces",
  selectedSchool: "central_books_selected_school",
  classes: "central_books_classes",
  courses: "central_books_courses",
  courseItems: "central_books_course_items",
  books: "central_books_books",
  extraInventory: "central_books_extra_inventory",
  invoices: "central_books_invoices",
  settings: "central_books_settings",
  sequence: "central_books_sequence",
};

const DEFAULT_USER: AdminUser = { username: "admin", password: "admin123", role: "admin" };
const DEFAULT_SCHOOL: SchoolWorkspace = {
  id: "school-default",
  name: "Brotherhood Academy",
  note: "Existing data workspace",
  createdAt: new Date().toISOString(),
};
const EARLY_CLASSES: ClassItem[] = [
  { id: "class-pg", name: "PG (Play Group)", note: "Play Group / Pre-Nursery" },
  { id: "class-nur", name: "NUR (Nursery)", note: "Nursery" },
  { id: "class-kg", name: "KG (Kindergarten)", note: "Kindergarten" },
];

const NUMBERED_CLASSES: ClassItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `class-${i + 1}`,
  name: `Class ${i + 1}`,
  note: "",
}));

const DEFAULT_CLASSES: ClassItem[] = [...EARLY_CLASSES, ...NUMBERED_CLASSES];
const DEFAULT_SETTINGS: Settings = {
  businessName: "Central Books",
  tagline: "Books, bundles, and billing for daily school supply operations",
  address: "",
  phone: "",
  email: "",
  upiId: "",
  thankYouNote: "Thank you",
  accentColor: "#0f766e",
  logoDataUrl: "",
  lowStockThreshold: 5,
};

function normalizeBookTitle(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BOOK_PUBLISHER_MAP: Record<string, string> = {
  [normalizeBookTitle("SUPER HERO CAPITAL WRITING")]: "KIRTI BOOKS",
  [normalizeBookTitle("SUPER HERO NUMBER BOOK")]: "KIRTI BOOKS",
  [normalizeBookTitle("SUPER HERO HINDI WRITING")]: "KIRTI BOOKS",
  [normalizeBookTitle("SUPER HERO RHYMES & HINDI RHYMES")]: "KIRTI BOOKS",
  [normalizeBookTitle("SUPER HERO DRAWING")]: "KIRTI BOOKS",
  [normalizeBookTitle("SUPER HERO ALPHABHET")]: "KIRTI BOOKS",
  [normalizeBookTitle("BRIGHT FUTURE AKSHAR GYAN")]: "A. I EDUCATIONAL PUBLICATION",
  [normalizeBookTitle("MEHAK URDU READER")]: "MOON PUBLICATIONS",
  [normalizeBookTitle("GULDASTA E URDU WRITING")]: "ELEGANT PUBLICATIONS",
  [normalizeBookTitle("GULDASTA E - URDU WRITING")]: "ELEGANT PUBLICATIONS",
  [normalizeBookTitle("KAUSER URDU")]: "A.I EDUCATIONAL PUBLICATIONS",
  [normalizeBookTitle("SUPER HERO GENERAL AWARENESS WITH PICTURE BOOK")]: "KIRTI BOOKS",
  [normalizeBookTitle("SUPER HERO GENRAL AWARENESS WITH PICTURE BOOK")]: "KIRTI BOOKS",
  [normalizeBookTitle("SUPER HERO SAHBD GYAN")]: "KIRTI BOOKS",
  [normalizeBookTitle("ENGLISH WITH HINDI WRITING")]: "STATUS BOOKS",
  [normalizeBookTitle("BHASHA SANRACHNA")]: "ELEGANT PUBLISHERS",
  [normalizeBookTitle("DRAWING DELIGHT")]: "CORAL BELLS",
  [normalizeBookTitle("GRAMMER & TRANSLATION")]: "ELEGANT PUBLISHERS",
  [normalizeBookTitle("BLOOMING BUDS")]: "ELEGANT PUBLISHERS",
  [normalizeBookTitle("NEXT LEVEL MATH")]: "WELLSPRING PUBLICATIONS",
  [normalizeBookTitle("ENGLISH CONVERSATION")]: "RIO BOOKS",
  [normalizeBookTitle("KNOWLEDGE PARK")]: "RIO BOOKS",
  [normalizeBookTitle("LEARN WELL SCIENCE")]: "LEARN WELL",
  [normalizeBookTitle("STEP TO PERFECTION ISLAMIC")]: "STEPONE",
  [normalizeBookTitle("STEPS TO PERFECTION ISLAMIC")]: "STEPONE",
  [normalizeBookTitle("MEHAK URDU KHUSHKHATI")]: "MOON PUBLISHERS",
  [normalizeBookTitle("MAHEK URDU READER")]: "MOON PUBLISHERS",
  [normalizeBookTitle("NEXT LEVEL SOCIAL STUDIES")]: "WELLSPRING PUBLICATIONS",
  [normalizeBookTitle("CYBER SPACE COMPUTER")]: "CORAL BELLS",
  [normalizeBookTitle("NAV NIDHI")]: "ELEGANT PUBLISHERS",
};

function getMappedPublisher(name: string) {
  return BOOK_PUBLISHER_MAP[normalizeBookTitle(name)] || "";
}

function normalizeBookPublishers(items: Book[]) {
  return items.map((item) => {
    const mappedPublisher = getMappedPublisher(item.name);
    if (!mappedPublisher || item.authorPublisher === mappedPublisher) return item;
    return { ...item, authorPublisher: mappedPublisher };
  });
}

type BookCatalogOverride = {
  price: number;
  rename?: string;
  subject?: string;
  authorPublisher?: string;
};

function createBookOverrideMap(entries: Array<[string, number, Omit<BookCatalogOverride, "price">?]>) {
  return entries.reduce<Record<string, BookCatalogOverride>>((acc, [name, price, meta]) => {
    acc[normalizeBookTitle(name)] = { price, ...(meta || {}) };
    return acc;
  }, {});
}

const CLASS_BOOK_OVERRIDES: Record<string, Record<string, BookCatalogOverride>> = {
  "class-4": createBookOverrideMap([
    ["ENGLISH WITH HINDI WRITING", 185],
    ["BHASHA SANRACHNA", 220],
    ["DRAWING DELIGHT", 190],
    ["GRAMMER & TRANSLATION", 270],
    ["BLOOMING BUDS", 240],
    ["NEXT LEVEL MATH", 395],
    ["ENGLISH CONVERSATION", 130],
    ["KNOWLEDGE PARK", 200],
    ["LEARN WELL SCIENCE", 320],
    ["STEP TO PERFECTION ISLAMIC", 253],
    ["STEPS TO PERFECTION ISLAMIC", 253],
    ["MEHAK URDU KHUSHKHATI", 142],
    ["MAHEK URDU READER", 165],
    ["NEXT LEVEL SOCIAL STUDIES", 290],
    ["CYBER SPACE COMPUTER", 240],
    ["NAV NIDHI", 240],
  ]),
  "class-5": createBookOverrideMap([
    ["ENGLISH WITH HINDI WRITING", 185],
    ["BHASHA SANRACHNA", 230],
    ["DRAWING DELIGHT", 190],
    ["GRAMMER & TRANSLATION", 310],
    ["BLOOMING BUDS", 260],
    ["NEXT LEVEL MATH", 410],
    ["ENGLISH CONVERSATION", 130],
    ["KNOWLEDGE PARK", 200],
    ["LEARN WELL SCIENCE", 330],
    ["STEP TO PERFECTION ISLAMIC", 273],
    ["STEPS TO PERFECTION ISLAMIC", 273],
    ["MEHAK URDU KHUSHKHATI", 145],
    ["MAHEK URDU READER", 175],
    ["NEXT LEVEL SOCIAL STUDIES", 299],
    ["CYBER SPACE COMPUTER", 250],
    ["NAV NIDHI", 250],
  ]),
  "class-6": createBookOverrideMap([
    ["ENGLISH WITH HINDI WRITING", 185],
    ["BHASHA SANRACHNA", 280],
    ["DRAWING DELIGHT", 230],
    ["GRAMMER & TRANSLATION", 360],
    ["BLOOMING BUDS", 270],
    ["NEXT LEVEL MATH", 480],
    ["ENGLISH CONVERSATION", 130],
    ["KNOWLEDGE PARK", 260],
    ["LEARN WELL SCIENCE", 480],
    ["STEP TO PERFECTION ISLAMIC", 175, { rename: "ISLAMIYAT", subject: "ISLAMIYAT", authorPublisher: "STEPONE" }],
    ["STEPS TO PERFECTION ISLAMIC", 175, { rename: "ISLAMIYAT", subject: "ISLAMIYAT", authorPublisher: "STEPONE" }],
    ["ISLAMIYAT", 175, { subject: "ISLAMIYAT", authorPublisher: "STEPONE" }],
    ["MEHAK URDU KHUSHKHATI", 142],
    ["MAHEK URDU READER", 195],
    ["NEXT LEVEL SOCIAL STUDIES", 435],
    ["CYBER SPACE COMPUTER", 280],
    ["NAV NIDHI", 270],
  ]),
  "class-7": createBookOverrideMap([
    ["ENGLISH WITH HINDI WRITING", 185],
    ["BHASHA SANRACHNA", 300],
    ["DRAWING DELIGHT", 240],
    ["GRAMMER & TRANSLATION", 380],
    ["BLOOMING BUDS", 290],
    ["NEXT LEVEL MATH", 520],
    ["ENGLISH CONVERSATION", 130],
    ["KNOWLEDGE PARK", 260],
    ["LEARN WELL SCIENCE", 500],
    ["STEP TO PERFECTION ISLAMIC", 185, { rename: "ISLAMIYAT", subject: "ISLAMIYAT", authorPublisher: "STEPONE" }],
    ["STEPS TO PERFECTION ISLAMIC", 185, { rename: "ISLAMIYAT", subject: "ISLAMIYAT", authorPublisher: "STEPONE" }],
    ["ISLAMIYAT", 185, { subject: "ISLAMIYAT", authorPublisher: "STEPONE" }],
    ["MEHAK URDU KHUSHKHATI", 142],
    ["MAHEK URDU READER", 199],
    ["NEXT LEVEL SOCIAL STUDIES", 455],
    ["CYBER SPACE COMPUTER", 290],
    ["NAV NIDHI", 290],
  ]),
  "class-8": createBookOverrideMap([
    ["BHASHA SANRACHNA", 320],
    ["DRAWING DELIGHT", 250],
    ["GRAMMER & TRANSLATION", 400],
    ["BLOOMING BUDS", 310],
    ["NEXT LEVEL MATH", 555],
    ["KNOWLEDGE PARK", 260],
    ["LEARN WELL SCIENCE", 510],
    ["STEP TO PERFECTION ISLAMIC", 185, { rename: "ISLAMIYAT", subject: "ISLAMIYAT", authorPublisher: "STEPONE" }],
    ["STEPS TO PERFECTION ISLAMIC", 185, { rename: "ISLAMIYAT", subject: "ISLAMIYAT", authorPublisher: "STEPONE" }],
    ["ISLAMIYAT", 185, { subject: "ISLAMIYAT", authorPublisher: "STEPONE" }],
    ["MAHEK URDU READER", 199],
    ["NEXT LEVEL SOCIAL STUDIES", 465],
    ["CYBER SPACE COMPUTER", 295],
    ["NAV NIDHI", 310],
  ]),
};

function normalizeClassSpecificBookCatalog(items: Book[]) {
  return items.map((item) => {
    const classOverrides = CLASS_BOOK_OVERRIDES[item.classId];
    if (!classOverrides) return item;
    const override = classOverrides[normalizeBookTitle(item.name)];
    if (!override) return item;
    return {
      ...item,
      name: override.rename ?? item.name,
      subject: override.subject ?? item.subject,
      authorPublisher: override.authorPublisher ?? item.authorPublisher,
      price: override.price,
    };
  });
}

function getStandardNotebookPrice(name: string) {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes("art copy")) return 20;
  if (normalized.includes("art register")) return 20;
  if (normalized.includes("test copy")) return 10;
  if (normalized.includes("small copy")) return 20;
  if (normalized.includes("register")) return 50;
  if (normalized.endsWith("copy") || normalized.includes(" copy")) return 32;
  return null;
}

function getStandardStationeryPrice(name: string) {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes("geometry box")) return 60;
  if (normalized.includes("water colour") || normalized.includes("water colours")) return 20;
  if (normalized.includes("scissors")) return 20;
  if (normalized.includes("pencil box")) return 50;
  if (normalized.includes("blue pen")) return 5;
  if (normalized.includes("black pen")) return 5;
  if (normalized.includes("blue pencil")) return 5;
  if (normalized.includes("scale")) return 5;
  if (normalized.includes("crayon") || normalized.includes("colour / crayons")) return 10;
  if (normalized.includes("glue")) return 10;
  if (normalized.includes("chart")) return 10;
  return null;
}

function getStandardExtraPrice(category: ExtraInventoryCategory, name: string) {
  if (category === "notebook") return getStandardNotebookPrice(name);
  if (category === "stationery") return getStandardStationeryPrice(name);
  return null;
}

function getStandardBundlePrice(itemType: BundleItemType, name: string) {
  if (itemType === "notebook") return getStandardNotebookPrice(name);
  if (itemType === "stationery") return getStandardStationeryPrice(name);
  return null;
}

function normalizeNotebookInventoryPrices(items: ExtraInventoryItem[]) {
  return items.map((item) => {
    const normalizedName = item.name.trim().toLowerCase() === "art register" ? "Art Copy" : item.name;
    const standardPrice = getStandardExtraPrice(item.category, normalizedName);
    const nextItem = normalizedName !== item.name ? { ...item, name: normalizedName } : item;
    if (standardPrice === null || nextItem.price === standardPrice) return nextItem;
    return { ...nextItem, price: standardPrice };
  });
}

function normalizeNotebookBundlePrices(items: CourseBundleItem[]) {
  return items.map((item) => {
    const normalizedName = item.itemName.trim().toLowerCase() === "art register" ? "Art Copy" : item.itemName;
    let nextItem = normalizedName !== item.itemName ? { ...item, itemName: normalizedName } : item;

    if (nextItem.itemType === "annualCharge" || nextItem.itemName.trim().toLowerCase() === "annual charge") {
      return {
        ...nextItem,
        itemType: "annualCharge" as BundleItemType,
        itemName: "Annual Charge",
        quantity: 1,
        price: 1200,
        subject: "Annual Charge",
      };
    }

    const standardPrice = getStandardBundlePrice(nextItem.itemType, nextItem.itemName);
    if (standardPrice === null || nextItem.price === standardPrice) return nextItem;
    return { ...nextItem, price: standardPrice };
  });
}

const DEFAULT_BOOKS: Book[] = [
  { id: "seed-pg-1", name: "SUPER HERO CAPITAL WRITING", classId: "class-pg", courseId: "", subject: "CAPITAL WRITING", authorPublisher: "", price: 240, stock: 39 },
  { id: "seed-pg-2", name: "SUPER HERO NUMBER BOOK", classId: "class-pg", courseId: "", subject: "NUMBER BOOK", authorPublisher: "", price: 250, stock: 40 },
  { id: "seed-pg-3", name: "SUPER HERO HINDI WRITING", classId: "class-pg", courseId: "", subject: "HINDI WRITING", authorPublisher: "", price: 240, stock: 40 },
  { id: "seed-pg-4", name: "SUPER HERO RHYMES & HINDI RHYMES", classId: "class-pg", courseId: "", subject: "RHYMES &HINDI RHYMM", authorPublisher: "", price: 145, stock: 40 },
  { id: "seed-pg-5", name: "SUPER HERO DRAWING", classId: "class-pg", courseId: "", subject: "DRAWING", authorPublisher: "", price: 140, stock: 40 },
  { id: "seed-pg-6", name: "SUPER HERO ALPHABHET", classId: "class-pg", courseId: "", subject: "ALPHABHET", authorPublisher: "", price: 190, stock: 40 },
  { id: "seed-pg-7", name: "BRIGHT FUTURE AKSHAR GYAN", classId: "class-pg", courseId: "", subject: "AKSHAR GYAN", authorPublisher: "", price: 225, stock: 40 },
  { id: "seed-pg-8", name: "MEHAK URDU READER", classId: "class-pg", courseId: "", subject: "URDU READER", authorPublisher: "", price: 130, stock: 50 },
  { id: "seed-pg-9", name: "GULDASTA E URDU WRITING", classId: "class-pg", courseId: "", subject: "URDU WRITING", authorPublisher: "", price: 120, stock: 50 },

  { id: "seed-nur-1", name: "SUPER HERO MATHS", classId: "class-nur", courseId: "", subject: "MATHS", authorPublisher: "", price: 250, stock: 30 },
  { id: "seed-nur-2", name: "SUPER HERO HINDI WRITING", classId: "class-nur", courseId: "", subject: "HINDI WRITING", authorPublisher: "", price: 240, stock: 30 },
  { id: "seed-nur-3", name: "SUPER HERO WRITING", classId: "class-nur", courseId: "", subject: "WRITING", authorPublisher: "", price: 240, stock: 30 },
  { id: "seed-nur-4", name: "SUPER HERO GENERAL AWARENESS WITH PICTURE BOOK", classId: "class-nur", courseId: "", subject: "GENERAL AWARENESS WITH PICTURE BOOK", authorPublisher: "", price: 250, stock: 30 },
  { id: "seed-nur-5", name: "SUPER HERO DRAWING", classId: "class-nur", courseId: "", subject: "DRAWING", authorPublisher: "", price: 140, stock: 29 },
  { id: "seed-nur-6", name: "SUPER HERO ENGLISH", classId: "class-nur", courseId: "", subject: "ENGLSIH", authorPublisher: "", price: 240, stock: 30 },
  { id: "seed-nur-7", name: "SUPER HERO RHYMES & HINDI RHYMES", classId: "class-nur", courseId: "", subject: "RHYMES & HINDI RHYMES", authorPublisher: "", price: 145, stock: 30 },
  { id: "seed-nur-8", name: "SUPER HERO SAHBD GYAN", classId: "class-nur", courseId: "", subject: "SAHBD GYAN", authorPublisher: "", price: 240, stock: 30 },
  { id: "seed-nur-9", name: "KAUSER URDU", classId: "class-nur", courseId: "", subject: "URDU", authorPublisher: "", price: 185, stock: 40 },
  { id: "seed-nur-10", name: "GULDASTA E - URDU WRITING", classId: "class-nur", courseId: "", subject: "URDU WRITING", authorPublisher: "", price: 120, stock: 40 },

  { id: "seed-kg-1", name: "SUPER HERO MATHS", classId: "class-kg", courseId: "", subject: "MATH", authorPublisher: "", price: 310, stock: 30 },
  { id: "seed-kg-2", name: "SUPER BOOK CURSIVE CAPITAL & SMALL", classId: "class-kg", courseId: "", subject: "CURSIVE CAPITAL & SMALL", authorPublisher: "", price: 240, stock: 30 },
  { id: "seed-kg-3", name: "SUPER HERO SWAR LEKHAN", classId: "class-kg", courseId: "", subject: "SWAR LEKHAN", authorPublisher: "", price: 240, stock: 30 },
  { id: "seed-kg-4", name: "SUPER HERO DRAWING", classId: "class-kg", courseId: "", subject: "DRAWING", authorPublisher: "", price: 140, stock: 30 },
  { id: "seed-kg-5", name: "SUPER HERO RHYMES & HINDI RHYMES", classId: "class-kg", courseId: "", subject: "RHYMES & HINDI RHYMES", authorPublisher: "", price: 145, stock: 30 },
  { id: "seed-kg-6", name: "SUPER HERO SWAR GYAN", classId: "class-kg", courseId: "", subject: "SWAR GYAN", authorPublisher: "", price: 270, stock: 30 },
  { id: "seed-kg-7", name: "SUPER HERO ENGLISH", classId: "class-kg", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 290, stock: 30 },
  { id: "seed-kg-8", name: "SUPER HERO GENRAL AWARENESS WITH PICTURE BOOK", classId: "class-kg", courseId: "", subject: "GENRAL AWARENESS WITH PICTURE BOOK", authorPublisher: "", price: 250, stock: 30 },
  { id: "seed-kg-9", name: "GULDASTA E - URDU WRITING", classId: "class-kg", courseId: "", subject: "URDU WRITING", authorPublisher: "", price: 140, stock: 40 },
  { id: "seed-kg-10", name: "KAUSER URDU", classId: "class-kg", courseId: "", subject: "URDU", authorPublisher: "", price: 185, stock: 40 },

  { id: "seed-c1-1", name: "ENGLISH WITH HINDI WRITING", classId: "class-1", courseId: "", subject: "WRITING", authorPublisher: "", price: 175, stock: 20 },
  { id: "seed-c1-2", name: "BHASHA SANRACHNA", classId: "class-1", courseId: "", subject: "HINDI", authorPublisher: "", price: 160, stock: 20 },
  { id: "seed-c1-3", name: "NAV NIDHI", classId: "class-1", courseId: "", subject: "HINDI LITERATURE", authorPublisher: "", price: 180, stock: 20 },
  { id: "seed-c1-4", name: "DRAWING DELIGHT", classId: "class-1", courseId: "", subject: "DRAWING", authorPublisher: "", price: 190, stock: 20 },
  { id: "seed-c1-5", name: "GRAMMER & TRANSLATION", classId: "class-1", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 180, stock: 20 },
  { id: "seed-c1-6", name: "BLOOMING BUDS", classId: "class-1", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 180, stock: 20 },
  { id: "seed-c1-7", name: "NEXT LEVEL MATH", classId: "class-1", courseId: "", subject: "MATH", authorPublisher: "", price: 299, stock: 20 },
  { id: "seed-c1-8", name: "ENGLISH CONVERSATION", classId: "class-1", courseId: "", subject: "COMUNICATION ENGLISH", authorPublisher: "", price: 110, stock: 20 },
  { id: "seed-c1-9", name: "KNOWLEDGE PARK", classId: "class-1", courseId: "", subject: "GK", authorPublisher: "", price: 150, stock: 20 },
  { id: "seed-c1-10", name: "LEARN WELL SCIENCE", classId: "class-1", courseId: "", subject: "SCIENCE", authorPublisher: "", price: 280, stock: 20 },
  { id: "seed-c1-11", name: "STEP TO PERFECTION ISLAMIC", classId: "class-1", courseId: "", subject: "ISLAMIC STUDIES", authorPublisher: "", price: 186, stock: 20 },
  { id: "seed-c1-12", name: "MEHAK URDU KHUSHKHATI", classId: "class-1", courseId: "", subject: "URDU", authorPublisher: "", price: 130, stock: 20 },
  { id: "seed-c1-13", name: "MAHEK URDU READER", classId: "class-1", courseId: "", subject: "URDU READER", authorPublisher: "", price: 140, stock: 20 },
  { id: "seed-c1-14", name: "NEXT LEVEL SOCIAL STUDIES", classId: "class-1", courseId: "", subject: "SOCIAL STUDIES", authorPublisher: "", price: 225, stock: 20 },
  { id: "seed-c1-15", name: "CYBER SPACE COMPUTER", classId: "class-1", courseId: "", subject: "COMPUTER", authorPublisher: "", price: 210, stock: 20 },

  { id: "seed-c2-1", name: "BHASHA SANRACHNA", classId: "class-2", courseId: "", subject: "HINDI", authorPublisher: "", price: 180, stock: 30 },
  { id: "seed-c2-2", name: "ENGLISH CONVERSATION", classId: "class-2", courseId: "", subject: "COMUNICATION", authorPublisher: "", price: 110, stock: 30 },
  { id: "seed-c2-3", name: "GRAMMER & TRANSLATION", classId: "class-2", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 210, stock: 30 },
  { id: "seed-c2-4", name: "BLOOMING BUDS", classId: "class-2", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 200, stock: 30 },
  { id: "seed-c2-5", name: "NAV NIDHI", classId: "class-2", courseId: "", subject: "HINDI LITERATURE", authorPublisher: "", price: 200, stock: 30 },
  { id: "seed-c2-6", name: "DRAWING DELIGHT", classId: "class-2", courseId: "", subject: "DRAWING", authorPublisher: "", price: 190, stock: 30 },
  { id: "seed-c2-7", name: "NEXT LEVEL MATH", classId: "class-2", courseId: "", subject: "MATH", authorPublisher: "", price: 319, stock: 30 },
  { id: "seed-c2-8", name: "KNOWLEDGE PARK", classId: "class-2", courseId: "", subject: "GK", authorPublisher: "", price: 170, stock: 30 },
  { id: "seed-c2-9", name: "LEARN WELL SCIENCE", classId: "class-2", courseId: "", subject: "SCIENCE", authorPublisher: "", price: 290, stock: 30 },
  { id: "seed-c2-10", name: "ENGLISH WITH HINDI WRITING", classId: "class-2", courseId: "", subject: "WRITING", authorPublisher: "", price: 175, stock: 30 },
  { id: "seed-c2-11", name: "STEPS TO PERFECTION ISLAMIC", classId: "class-2", courseId: "", subject: "ISLAMIC STUDIES", authorPublisher: "", price: 218, stock: 30 },
  { id: "seed-c2-12", name: "MAHEK URDU READER", classId: "class-2", courseId: "", subject: "URDU READER", authorPublisher: "", price: 145, stock: 30 },
  { id: "seed-c2-13", name: "MEHAK URDU KHUSHKHATI", classId: "class-2", courseId: "", subject: "URDU", authorPublisher: "", price: 135, stock: 30 },
  { id: "seed-c2-14", name: "NEXT LEVEL SOCIAL STUDIES", classId: "class-2", courseId: "", subject: "SOCIAL STUDIES", authorPublisher: "", price: 249, stock: 30 },
  { id: "seed-c2-15", name: "CYBER SPACE COMPUTER", classId: "class-2", courseId: "", subject: "COMPUTER", authorPublisher: "", price: 220, stock: 30 },

  { id: "seed-c3-1", name: "CYBER SPACE COMPUTER", classId: "class-3", courseId: "", subject: "COMPUTER", authorPublisher: "", price: 230, stock: 34 },
  { id: "seed-c3-2", name: "KNOWLEDGE PARK", classId: "class-3", courseId: "", subject: "GK", authorPublisher: "", price: 180, stock: 34 },
  { id: "seed-c3-3", name: "ENGLISH CONVERSATION", classId: "class-3", courseId: "", subject: "COMUNICATION ENGLISH", authorPublisher: "", price: 110, stock: 34 },
  { id: "seed-c3-4", name: "ENGLISH WITH HINDI WRITING", classId: "class-3", courseId: "", subject: "WRITING", authorPublisher: "", price: 179, stock: 34 },
  { id: "seed-c3-5", name: "MEHAK URDU KHUSHKHATI", classId: "class-3", courseId: "", subject: "URDU", authorPublisher: "", price: 140, stock: 34 },
  { id: "seed-c3-6", name: "MAHEK URDU READER", classId: "class-3", courseId: "", subject: "URDU READER", authorPublisher: "", price: 158, stock: 34 },
  { id: "seed-c3-7", name: "STEP TO PERFECTION ISLAMIC", classId: "class-3", courseId: "", subject: "ISLAMIC STUDIES", authorPublisher: "", price: 218, stock: 34 },
  { id: "seed-c3-8", name: "NEXT LEVEL MATH", classId: "class-3", courseId: "", subject: "MATH", authorPublisher: "", price: 375, stock: 34 },
  { id: "seed-c3-9", name: "LEARN WELL SCIENCE", classId: "class-3", courseId: "", subject: "SCIENCE", authorPublisher: "", price: 300, stock: 34 },
  { id: "seed-c3-10", name: "NEXT LEVEL SOCIAL STUDIES", classId: "class-3", courseId: "", subject: "SOCIAL STUDIES", authorPublisher: "", price: 269, stock: 34 },
  { id: "seed-c3-11", name: "GRAMMER & TRANSLATION", classId: "class-3", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 240, stock: 34 },
  { id: "seed-c3-12", name: "NAV NIDHI", classId: "class-3", courseId: "", subject: "HINDI LITERATURE", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c3-13", name: "BLOOMING BUDS", classId: "class-3", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c3-14", name: "DRAWING DELIGHT", classId: "class-3", courseId: "", subject: "DRAWING", authorPublisher: "", price: 190, stock: 34 },
  { id: "seed-c3-15", name: "BHASHA SANRACHNA", classId: "class-3", courseId: "", subject: "HINDI", authorPublisher: "", price: 200, stock: 34 },

  { id: "seed-c4-1", name: "CYBER SPACE COMPUTER", classId: "class-4", courseId: "", subject: "COMPUTER", authorPublisher: "", price: 230, stock: 34 },
  { id: "seed-c4-2", name: "KNOWLEDGE PARK", classId: "class-4", courseId: "", subject: "GK", authorPublisher: "", price: 180, stock: 34 },
  { id: "seed-c4-3", name: "ENGLISH CONVERSATION", classId: "class-4", courseId: "", subject: "COMUNICATION ENGLISH", authorPublisher: "", price: 110, stock: 34 },
  { id: "seed-c4-4", name: "ENGLISH WITH HINDI WRITING", classId: "class-4", courseId: "", subject: "WRITING", authorPublisher: "", price: 179, stock: 34 },
  { id: "seed-c4-5", name: "MEHAK URDU KHUSHKHATI", classId: "class-4", courseId: "", subject: "URDU", authorPublisher: "", price: 140, stock: 34 },
  { id: "seed-c4-6", name: "MAHEK URDU READER", classId: "class-4", courseId: "", subject: "URDU READER", authorPublisher: "", price: 158, stock: 34 },
  { id: "seed-c4-7", name: "STEP TO PERFECTION ISLAMIC", classId: "class-4", courseId: "", subject: "ISLAMIC STUDIES", authorPublisher: "", price: 218, stock: 34 },
  { id: "seed-c4-8", name: "NEXT LEVEL MATH", classId: "class-4", courseId: "", subject: "MATH", authorPublisher: "", price: 375, stock: 34 },
  { id: "seed-c4-9", name: "LEARN WELL SCIENCE", classId: "class-4", courseId: "", subject: "SCIENCE", authorPublisher: "", price: 300, stock: 34 },
  { id: "seed-c4-10", name: "NEXT LEVEL SOCIAL STUDIES", classId: "class-4", courseId: "", subject: "SOCIAL STUDIES", authorPublisher: "", price: 269, stock: 34 },
  { id: "seed-c4-11", name: "GRAMMER & TRANSLATION", classId: "class-4", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 240, stock: 34 },
  { id: "seed-c4-12", name: "NAV NIDHI", classId: "class-4", courseId: "", subject: "HINDI LITERATURE", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c4-13", name: "BLOOMING BUDS", classId: "class-4", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c4-14", name: "DRAWING DELIGHT", classId: "class-4", courseId: "", subject: "DRAWING", authorPublisher: "", price: 190, stock: 34 },
  { id: "seed-c4-15", name: "BHASHA SANRACHNA", classId: "class-4", courseId: "", subject: "HINDI", authorPublisher: "", price: 200, stock: 34 },

  { id: "seed-c5-1", name: "CYBER SPACE COMPUTER", classId: "class-5", courseId: "", subject: "COMPUTER", authorPublisher: "", price: 230, stock: 34 },
  { id: "seed-c5-2", name: "KNOWLEDGE PARK", classId: "class-5", courseId: "", subject: "GK", authorPublisher: "", price: 180, stock: 34 },
  { id: "seed-c5-3", name: "ENGLISH CONVERSATION", classId: "class-5", courseId: "", subject: "COMUNICATION ENGLISH", authorPublisher: "", price: 110, stock: 34 },
  { id: "seed-c5-4", name: "ENGLISH WITH HINDI WRITING", classId: "class-5", courseId: "", subject: "WRITING", authorPublisher: "", price: 179, stock: 34 },
  { id: "seed-c5-5", name: "MEHAK URDU KHUSHKHATI", classId: "class-5", courseId: "", subject: "URDU", authorPublisher: "", price: 140, stock: 34 },
  { id: "seed-c5-6", name: "MAHEK URDU READER", classId: "class-5", courseId: "", subject: "URDU READER", authorPublisher: "", price: 158, stock: 34 },
  { id: "seed-c5-7", name: "STEP TO PERFECTION ISLAMIC", classId: "class-5", courseId: "", subject: "ISLAMIC STUDIES", authorPublisher: "", price: 218, stock: 34 },
  { id: "seed-c5-8", name: "NEXT LEVEL MATH", classId: "class-5", courseId: "", subject: "MATH", authorPublisher: "", price: 375, stock: 34 },
  { id: "seed-c5-9", name: "LEARN WELL SCIENCE", classId: "class-5", courseId: "", subject: "SCIENCE", authorPublisher: "", price: 300, stock: 34 },
  { id: "seed-c5-10", name: "NEXT LEVEL SOCIAL STUDIES", classId: "class-5", courseId: "", subject: "SOCIAL STUDIES", authorPublisher: "", price: 269, stock: 34 },
  { id: "seed-c5-11", name: "GRAMMER & TRANSLATION", classId: "class-5", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 240, stock: 34 },
  { id: "seed-c5-12", name: "NAV NIDHI", classId: "class-5", courseId: "", subject: "HINDI LITERATURE", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c5-13", name: "BLOOMING BUDS", classId: "class-5", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c5-14", name: "DRAWING DELIGHT", classId: "class-5", courseId: "", subject: "DRAWING", authorPublisher: "", price: 190, stock: 34 },
  { id: "seed-c5-15", name: "BHASHA SANRACHNA", classId: "class-5", courseId: "", subject: "HINDI", authorPublisher: "", price: 200, stock: 34 },

  { id: "seed-c6-1", name: "CYBER SPACE COMPUTER", classId: "class-6", courseId: "", subject: "COMPUTER", authorPublisher: "", price: 230, stock: 34 },
  { id: "seed-c6-2", name: "KNOWLEDGE PARK", classId: "class-6", courseId: "", subject: "GK", authorPublisher: "", price: 180, stock: 34 },
  { id: "seed-c6-3", name: "ENGLISH CONVERSATION", classId: "class-6", courseId: "", subject: "COMUNICATION ENGLISH", authorPublisher: "", price: 110, stock: 34 },
  { id: "seed-c6-4", name: "ENGLISH WITH HINDI WRITING", classId: "class-6", courseId: "", subject: "WRITING", authorPublisher: "", price: 179, stock: 34 },
  { id: "seed-c6-5", name: "MEHAK URDU KHUSHKHATI", classId: "class-6", courseId: "", subject: "URDU", authorPublisher: "", price: 140, stock: 34 },
  { id: "seed-c6-6", name: "MAHEK URDU READER", classId: "class-6", courseId: "", subject: "URDU READER", authorPublisher: "", price: 158, stock: 34 },
  { id: "seed-c6-7", name: "STEP TO PERFECTION ISLAMIC", classId: "class-6", courseId: "", subject: "ISLAMIC STUDIES", authorPublisher: "", price: 218, stock: 34 },
  { id: "seed-c6-8", name: "NEXT LEVEL MATH", classId: "class-6", courseId: "", subject: "MATH", authorPublisher: "", price: 375, stock: 34 },
  { id: "seed-c6-9", name: "LEARN WELL SCIENCE", classId: "class-6", courseId: "", subject: "SCIENCE", authorPublisher: "", price: 300, stock: 34 },
  { id: "seed-c6-10", name: "NEXT LEVEL SOCIAL STUDIES", classId: "class-6", courseId: "", subject: "SOCIAL STUDIES", authorPublisher: "", price: 269, stock: 34 },
  { id: "seed-c6-11", name: "GRAMMER & TRANSLATION", classId: "class-6", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 240, stock: 34 },
  { id: "seed-c6-12", name: "NAV NIDHI", classId: "class-6", courseId: "", subject: "HINDI LITERATURE", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c6-13", name: "BLOOMING BUDS", classId: "class-6", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c6-14", name: "DRAWING DELIGHT", classId: "class-6", courseId: "", subject: "DRAWING", authorPublisher: "", price: 190, stock: 34 },
  { id: "seed-c6-15", name: "BHASHA SANRACHNA", classId: "class-6", courseId: "", subject: "HINDI", authorPublisher: "", price: 200, stock: 34 },

  { id: "seed-c7-1", name: "CYBER SPACE COMPUTER", classId: "class-7", courseId: "", subject: "COMPUTER", authorPublisher: "", price: 230, stock: 34 },
  { id: "seed-c7-2", name: "KNOWLEDGE PARK", classId: "class-7", courseId: "", subject: "GK", authorPublisher: "", price: 180, stock: 34 },
  { id: "seed-c7-3", name: "ENGLISH CONVERSATION", classId: "class-7", courseId: "", subject: "COMUNICATION ENGLISH", authorPublisher: "", price: 110, stock: 34 },
  { id: "seed-c7-4", name: "ENGLISH WITH HINDI WRITING", classId: "class-7", courseId: "", subject: "WRITING", authorPublisher: "", price: 179, stock: 34 },
  { id: "seed-c7-5", name: "MEHAK URDU KHUSHKHATI", classId: "class-7", courseId: "", subject: "URDU", authorPublisher: "", price: 140, stock: 34 },
  { id: "seed-c7-6", name: "MAHEK URDU READER", classId: "class-7", courseId: "", subject: "URDU READER", authorPublisher: "", price: 158, stock: 34 },
  { id: "seed-c7-7", name: "STEP TO PERFECTION ISLAMIC", classId: "class-7", courseId: "", subject: "ISLAMIC STUDIES", authorPublisher: "", price: 218, stock: 34 },
  { id: "seed-c7-8", name: "NEXT LEVEL MATH", classId: "class-7", courseId: "", subject: "MATH", authorPublisher: "", price: 375, stock: 34 },
  { id: "seed-c7-9", name: "LEARN WELL SCIENCE", classId: "class-7", courseId: "", subject: "SCIENCE", authorPublisher: "", price: 300, stock: 34 },
  { id: "seed-c7-10", name: "NEXT LEVEL SOCIAL STUDIES", classId: "class-7", courseId: "", subject: "SOCIAL STUDIES", authorPublisher: "", price: 269, stock: 34 },
  { id: "seed-c7-11", name: "GRAMMER & TRANSLATION", classId: "class-7", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 240, stock: 34 },
  { id: "seed-c7-12", name: "NAV NIDHI", classId: "class-7", courseId: "", subject: "HINDI LITERATURE", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c7-13", name: "BLOOMING BUDS", classId: "class-7", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c7-14", name: "DRAWING DELIGHT", classId: "class-7", courseId: "", subject: "DRAWING", authorPublisher: "", price: 190, stock: 34 },
  { id: "seed-c7-15", name: "BHASHA SANRACHNA", classId: "class-7", courseId: "", subject: "HINDI", authorPublisher: "", price: 200, stock: 34 },

  { id: "seed-c8-1", name: "CYBER SPACE COMPUTER", classId: "class-8", courseId: "", subject: "COMPUTER", authorPublisher: "", price: 230, stock: 34 },
  { id: "seed-c8-2", name: "KNOWLEDGE PARK", classId: "class-8", courseId: "", subject: "GK", authorPublisher: "", price: 180, stock: 34 },
  { id: "seed-c8-3", name: "ENGLISH CONVERSATION", classId: "class-8", courseId: "", subject: "COMUNICATION ENGLISH", authorPublisher: "", price: 110, stock: 34 },
  { id: "seed-c8-4", name: "ENGLISH WITH HINDI WRITING", classId: "class-8", courseId: "", subject: "WRITING", authorPublisher: "", price: 179, stock: 34 },
  { id: "seed-c8-5", name: "MEHAK URDU KHUSHKHATI", classId: "class-8", courseId: "", subject: "URDU", authorPublisher: "", price: 140, stock: 34 },
  { id: "seed-c8-6", name: "MAHEK URDU READER", classId: "class-8", courseId: "", subject: "URDU READER", authorPublisher: "", price: 158, stock: 34 },
  { id: "seed-c8-7", name: "STEP TO PERFECTION ISLAMIC", classId: "class-8", courseId: "", subject: "ISLAMIC STUDIES", authorPublisher: "", price: 218, stock: 34 },
  { id: "seed-c8-8", name: "NEXT LEVEL MATH", classId: "class-8", courseId: "", subject: "MATH", authorPublisher: "", price: 375, stock: 34 },
  { id: "seed-c8-9", name: "LEARN WELL SCIENCE", classId: "class-8", courseId: "", subject: "SCIENCE", authorPublisher: "", price: 300, stock: 34 },
  { id: "seed-c8-10", name: "NEXT LEVEL SOCIAL STUDIES", classId: "class-8", courseId: "", subject: "SOCIAL STUDIES", authorPublisher: "", price: 269, stock: 34 },
  { id: "seed-c8-11", name: "GRAMMER & TRANSLATION", classId: "class-8", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 240, stock: 34 },
  { id: "seed-c8-12", name: "NAV NIDHI", classId: "class-8", courseId: "", subject: "HINDI LITERATURE", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c8-13", name: "BLOOMING BUDS", classId: "class-8", courseId: "", subject: "ENGLISH", authorPublisher: "", price: 220, stock: 34 },
  { id: "seed-c8-14", name: "DRAWING DELIGHT", classId: "class-8", courseId: "", subject: "DRAWING", authorPublisher: "", price: 190, stock: 34 },
  { id: "seed-c8-15", name: "BHASHA SANRACHNA", classId: "class-8", courseId: "", subject: "HINDI", authorPublisher: "", price: 200, stock: 34 },
];

const DEFAULT_EXTRA_INVENTORY: ExtraInventoryItem[] = [
  { id: "seed-extra-pg-hindi-copy", category: "notebook", name: "Hindi Copy", price: 32, stock: 200, note: "Play Group (PG)" },
  { id: "seed-extra-pg-english-copy", category: "notebook", name: "English Copy", price: 32, stock: 200, note: "Play Group (PG)" },
  { id: "seed-extra-pg-math-copy", category: "notebook", name: "Math Copy", price: 32, stock: 200, note: "Play Group (PG)" },
  { id: "seed-extra-pg-urdu-copy", category: "notebook", name: "Urdu Copy", price: 32, stock: 200, note: "Play Group (PG)" },

  { id: "seed-extra-nur-hindi-copy", category: "notebook", name: "Hindi Copy", price: 32, stock: 200, note: "Nursery / KG" },
  { id: "seed-extra-nur-english-copy", category: "notebook", name: "English Copy", price: 32, stock: 200, note: "Nursery / KG" },
  { id: "seed-extra-nur-math-copy", category: "notebook", name: "Math Copy", price: 32, stock: 200, note: "Nursery / KG" },
  { id: "seed-extra-nur-urdu-copy", category: "notebook", name: "Urdu Copy", price: 32, stock: 200, note: "Nursery / KG" },
  { id: "seed-extra-nur-evs-copy", category: "notebook", name: "EVS Copy", price: 32, stock: 120, note: "Nursery / KG" },
  { id: "seed-extra-nur-art-copy", category: "notebook", name: "Art Copy", price: 32, stock: 120, note: "Nursery / KG" },

  { id: "seed-extra-1to5-hindi-regular", category: "notebook", name: "Hindi Copy", price: 32, stock: 300, note: "Class 1 to 5 Regular Copies" },
  { id: "seed-extra-1to5-english-regular", category: "notebook", name: "English Copy", price: 32, stock: 300, note: "Class 1 to 5 Regular Copies" },
  { id: "seed-extra-1to5-math-regular", category: "notebook", name: "Math Copy", price: 32, stock: 300, note: "Class 1 to 5 Regular Copies" },
  { id: "seed-extra-1to5-urdu-regular", category: "notebook", name: "Urdu Copy", price: 32, stock: 220, note: "Class 1 to 5 Regular Copies" },
  { id: "seed-extra-1to5-science-regular", category: "notebook", name: "Science Copy", price: 32, stock: 180, note: "Class 1 to 5 Regular Copies" },
  { id: "seed-extra-1to5-computer-small", category: "notebook", name: "Computer Small Copy", price: 20, stock: 180, note: "Class 1 to 5 Regular Copies" },
  { id: "seed-extra-1to5-gk-small", category: "notebook", name: "GK Small Copy", price: 20, stock: 180, note: "Class 1 to 5 Regular Copies" },
  { id: "seed-extra-1to5-islamic-small", category: "notebook", name: "Islamic Studies Small Copy", price: 20, stock: 180, note: "Class 1 to 5 Regular Copies" },
  { id: "seed-extra-1to5-sst-regular", category: "notebook", name: "SST Copy", price: 32, stock: 180, note: "Class 1 to 5 Regular Copies" },
  { id: "seed-extra-1to5-art-regular", category: "notebook", name: "Art Copy", price: 32, stock: 180, note: "Class 1 to 5 Regular Copies" },

  { id: "seed-extra-1to5-hindi-test", category: "notebook", name: "Hindi Test Copy", price: 10, stock: 200, note: "Class 1 to 5 Test Copies - No Cover" },
  { id: "seed-extra-1to5-english-test", category: "notebook", name: "English Test Copy", price: 10, stock: 200, note: "Class 1 to 5 Test Copies - No Cover" },
  { id: "seed-extra-1to5-math-test", category: "notebook", name: "Math Test Copy", price: 10, stock: 200, note: "Class 1 to 5 Test Copies - No Cover" },
  { id: "seed-extra-1to5-urdu-test", category: "notebook", name: "Urdu Test Copy", price: 10, stock: 200, note: "Class 1 to 5 Test Copies - No Cover" },
  { id: "seed-extra-1to5-computer-test", category: "notebook", name: "Computer Test Copy", price: 10, stock: 160, note: "Class 1 to 5 Test Copies - No Cover" },
  { id: "seed-extra-1to5-gk-test", category: "notebook", name: "GK Test Copy", price: 10, stock: 160, note: "Class 1 to 5 Test Copies - No Cover" },
  { id: "seed-extra-1to5-islamic-test", category: "notebook", name: "Islamic Studies Test Copy", price: 10, stock: 160, note: "Class 1 to 5 Test Copies - No Cover" },
  { id: "seed-extra-1to5-sst-test", category: "notebook", name: "SST Test Copy", price: 10, stock: 160, note: "Class 1 to 5 Test Copies - No Cover" },
  { id: "seed-extra-1to5-science-test", category: "notebook", name: "Science Test Copy", price: 10, stock: 160, note: "Class 1 to 5 Test Copies - No Cover" },

  { id: "seed-extra-pg-pencil-box", category: "stationery", name: "Pencil Box", price: 50, stock: 120, note: "Play Group to KG Stationery" },
  { id: "seed-extra-pg-crayons", category: "stationery", name: "Crayons", price: 10, stock: 160, note: "Play Group to KG Stationery" },
  { id: "seed-extra-pg-blue-pencil", category: "stationery", name: "Blue Pencil", price: 5, stock: 200, note: "Play Group to KG Stationery" },
  { id: "seed-extra-pg-charts", category: "stationery", name: "Charts", price: 10, stock: 160, note: "Play Group to KG Stationery" },
  { id: "seed-extra-pg-glue", category: "stationery", name: "Glue", price: 10, stock: 160, note: "Play Group to KG Stationery" },

  { id: "seed-extra-1to5-charts", category: "stationery", name: "Charts", price: 10, stock: 100, note: "Class 1 to 5 Stationery" },
  { id: "seed-extra-1to5-glue-sticks", category: "stationery", name: "Glue Sticks", price: 10, stock: 200, note: "Class 1 to 5 Stationery" },
  { id: "seed-extra-1to5-pencil-box", category: "stationery", name: "Pencil Box", price: 50, stock: 120, note: "Class 1 to 5 Stationery" },
  { id: "seed-extra-1to5-colours", category: "stationery", name: "Colour / Crayons", price: 10, stock: 120, note: "Class 1 to 5 Stationery" },
  { id: "seed-extra-1to5-blue-pencil", category: "stationery", name: "Blue Pencil", price: 5, stock: 200, note: "Class 1 to 5 Stationery" },
  { id: "seed-extra-1to5-scale", category: "stationery", name: "Scale", price: 5, stock: 200, note: "Class 1 to 5 Stationery" },

  { id: "seed-extra-6to8-hindi-register", category: "notebook", name: "Hindi Register", price: 0, stock: 220, note: "Class 6 to 8 Registers" },
  { id: "seed-extra-6to8-english-register", category: "notebook", name: "English Register", price: 0, stock: 220, note: "Class 6 to 8 Registers" },
  { id: "seed-extra-6to8-math-register", category: "notebook", name: "Math Register", price: 0, stock: 180, note: "Class 6 to 8 Registers" },
  { id: "seed-extra-6to8-urdu-register", category: "notebook", name: "Urdu Register", price: 0, stock: 180, note: "Class 6 to 8 Registers" },
  { id: "seed-extra-6to8-science-register", category: "notebook", name: "Science Register", price: 0, stock: 180, note: "Class 6 to 8 Registers" },
  { id: "seed-extra-6to8-computer-register", category: "notebook", name: "Computer Register", price: 0, stock: 180, note: "Class 6 to 8 Registers" },
  { id: "seed-extra-6to8-gk-small-register", category: "notebook", name: "GK Small Register", price: 0, stock: 150, note: "Class 6 to 8 Registers" },
  { id: "seed-extra-6to8-sst-register", category: "notebook", name: "SST Register", price: 0, stock: 180, note: "Class 6 to 8 Registers" },
  { id: "seed-extra-6to8-art-register", category: "notebook", name: "Art Copy", price: 20, stock: 150, note: "Class 6 to 8 Registers" },

  { id: "seed-extra-6to8-blue-pen", category: "stationery", name: "Blue Pen", price: 5, stock: 250, note: "Class 6 to 8 Stationery" },
  { id: "seed-extra-6to8-black-pen", category: "stationery", name: "Black Pen", price: 5, stock: 250, note: "Class 6 to 8 Stationery" },
  { id: "seed-extra-6to8-geometry-box", category: "stationery", name: "Geometry Box", price: 60, stock: 120, note: "Class 6 to 8 Stationery" },
  { id: "seed-extra-6to8-charts", category: "stationery", name: "Charts", price: 10, stock: 120, note: "Class 6 to 8 Stationery" },
  { id: "seed-extra-6to8-glue", category: "stationery", name: "Glue", price: 10, stock: 160, note: "Class 6 to 8 Stationery" },
  { id: "seed-extra-6to8-scissors", category: "stationery", name: "Scissors", price: 20, stock: 120, note: "Class 6 to 8 Stationery" },
  { id: "seed-extra-6to8-water-colours", category: "stationery", name: "Water Colours", price: 20, stock: 120, note: "Class 6 to 8 Stationery" },
  { id: "seed-extra-6to8-blue-pencil", category: "stationery", name: "Blue Pencil", price: 5, stock: 200, note: "Class 6 to 8 Stationery" },
];

const DEFAULT_BUNDLES: CourseBundle[] = [
  { id: "bundle-pg", name: "Play Group (PG)", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-nursery", name: "Nursery", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-kg", name: "KG", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-1", name: "Class 1", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-2", name: "Class 2", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-3", name: "Class 3", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-4", name: "Class 4", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-5", name: "Class 5", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-6", name: "Class 6", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-7", name: "Class 7", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-8", name: "Class 8", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-9", name: "Class 9", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-10", name: "Class 10", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-11", name: "Class 11", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
  { id: "bundle-class-12", name: "Class 12", schoolName: "Brotherhood Academy", note: "Seeded class bundle", createdAt: new Date().toISOString() },
];

const DEFAULT_BUNDLE_ID_SET = new Set(DEFAULT_BUNDLES.map((bundle) => bundle.id));

function createAnnualChargeBundleItems(): CourseBundleItem[] {
  return DEFAULT_BUNDLES.map((bundle) => ({
    id: `bundle-item-${bundle.id}-annual-charge`,
    courseId: bundle.id,
    productId: "",
    itemType: "annualCharge",
    itemName: "Annual Charge",
    quantity: 1,
    price: 1200,
    classId: inferClassIdFromCourse(bundle.id, DEFAULT_BUNDLES),
    subject: "Annual Charge",
    createdAt: new Date().toISOString(),
  }));
}

function getDefaultBundleIdForClassId(classId: string) {
  if (classId === "class-pg") return "bundle-pg";
  if (classId === "class-nur") return "bundle-nursery";
  if (classId === "class-kg") return "bundle-kg";
  if (classId.startsWith("class-")) {
    const suffix = classId.replace("class-", "");
    if (/^\d+$/.test(suffix)) return `bundle-class-${suffix}`;
  }
  return "";
}

function inferClassIdFromCourse(courseId: string, courses: CourseBundle[]) {
  if (courseId === "bundle-pg") return "class-pg";
  if (courseId === "bundle-nursery") return "class-nur";
  if (courseId === "bundle-kg") return "class-kg";
  if (courseId.startsWith("bundle-class-")) {
    const suffix = courseId.replace("bundle-class-", "");
    if (/^\d+$/.test(suffix)) return `class-${suffix}`;
  }

  const course = courses.find((item) => item.id === courseId);
  if (!course) return "";
  const name = course.name.trim().toLowerCase();
  if (name.includes("play group") || name === "pg" || name.includes("(pg)")) return "class-pg";
  if (name.includes("nursery") || name.startsWith("nur")) return "class-nur";
  if (name.includes("kindergarten") || name === "kg") return "class-kg";
  const match = name.match(/class\s*(\d+)/i);
  if (match) return `class-${match[1]}`;
  return "";
}

function normalizeBooksToClassBundles(items: Book[], availableCourseIds: Set<string>) {
  return items.map((item) => {
    const targetBundleId = getDefaultBundleIdForClassId(item.classId);
    if (!targetBundleId || !availableCourseIds.has(targetBundleId)) return item;
    if (!item.courseId || (DEFAULT_BUNDLE_ID_SET.has(item.courseId) && item.courseId !== targetBundleId)) {
      return { ...item, courseId: targetBundleId };
    }
    return item;
  });
}

function normalizeCourseItemsToClassBundles(items: CourseBundleItem[], courses: CourseBundle[], availableCourseIds: Set<string>) {
  return items.map((item) => {
    const inferredClassId = item.classId || inferClassIdFromCourse(item.courseId, courses);
    const targetBundleId = inferredClassId ? getDefaultBundleIdForClassId(inferredClassId) : "";

    let nextItem = item;
    if (inferredClassId && inferredClassId !== item.classId) {
      nextItem = { ...nextItem, classId: inferredClassId };
    }
    if (targetBundleId && availableCourseIds.has(targetBundleId) && (!nextItem.courseId || (DEFAULT_BUNDLE_ID_SET.has(nextItem.courseId) && nextItem.courseId !== targetBundleId))) {
      nextItem = { ...nextItem, courseId: targetBundleId };
    }
    return nextItem;
  });
}

function getEffectiveCourseItemsForCourse(courseId: string, bundleItems: CourseBundleItem[], allBooks: Book[]) {
  const explicitItems = bundleItems.filter((item) => item.courseId === courseId);
  const explicitBookIds = new Set(explicitItems.filter((item) => item.itemType === "book" && item.productId).map((item) => item.productId));
  const linkedBooks = allBooks
    .filter((book) => book.courseId === courseId && !explicitBookIds.has(book.id))
    .map<EffectiveCourseBundleItem>((book) => ({
      id: `auto-book-${book.id}`,
      courseId,
      productId: book.id,
      itemType: "book",
      itemName: book.name,
      quantity: 1,
      price: book.price,
      classId: book.classId,
      subject: book.subject,
      createdAt: new Date().toISOString(),
      autoLinked: true,
    }));

  return [...explicitItems, ...linkedBooks];
}

const DEFAULT_BUNDLE_ITEMS: CourseBundleItem[] = [
  { id: "bundle-item-pg-hindi", courseId: "bundle-pg", productId: "seed-extra-pg-hindi-copy", itemType: "notebook", itemName: "Hindi Copy", quantity: 2, price: 32, classId: "class-pg", subject: "Hindi Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-pg-english", courseId: "bundle-pg", productId: "seed-extra-pg-english-copy", itemType: "notebook", itemName: "English Copy", quantity: 2, price: 32, classId: "class-pg", subject: "English Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-pg-math", courseId: "bundle-pg", productId: "seed-extra-pg-math-copy", itemType: "notebook", itemName: "Math Copy", quantity: 2, price: 32, classId: "class-pg", subject: "Math Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-pg-urdu", courseId: "bundle-pg", productId: "seed-extra-pg-urdu-copy", itemType: "notebook", itemName: "Urdu Copy", quantity: 2, price: 32, classId: "class-pg", subject: "Urdu Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-pg-pencil-box", courseId: "bundle-pg", productId: "seed-extra-pg-pencil-box", itemType: "stationery", itemName: "Pencil Box", quantity: 1, price: 50, classId: "class-pg", subject: "Pencil Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-pg-crayons", courseId: "bundle-pg", productId: "seed-extra-pg-crayons", itemType: "stationery", itemName: "Crayons", quantity: 1, price: 10, classId: "class-pg", subject: "Crayons", createdAt: new Date().toISOString() },
  { id: "bundle-item-pg-blue-pencil", courseId: "bundle-pg", productId: "seed-extra-pg-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 5, classId: "class-pg", subject: "Blue Pencil", createdAt: new Date().toISOString() },
  { id: "bundle-item-pg-charts", courseId: "bundle-pg", productId: "seed-extra-pg-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 10, classId: "class-pg", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-pg-glue", courseId: "bundle-pg", productId: "seed-extra-pg-glue", itemType: "stationery", itemName: "Glue", quantity: 1, price: 10, classId: "class-pg", subject: "Glue", createdAt: new Date().toISOString() },

  { id: "bundle-item-nur-hindi", courseId: "bundle-nursery", productId: "seed-extra-nur-hindi-copy", itemType: "notebook", itemName: "Hindi Copy", quantity: 2, price: 32, classId: "class-nur", subject: "Hindi Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-nur-english", courseId: "bundle-nursery", productId: "seed-extra-nur-english-copy", itemType: "notebook", itemName: "English Copy", quantity: 2, price: 32, classId: "class-nur", subject: "English Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-nur-math", courseId: "bundle-nursery", productId: "seed-extra-nur-math-copy", itemType: "notebook", itemName: "Math Copy", quantity: 2, price: 32, classId: "class-nur", subject: "Math Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-nur-urdu", courseId: "bundle-nursery", productId: "seed-extra-nur-urdu-copy", itemType: "notebook", itemName: "Urdu Copy", quantity: 2, price: 32, classId: "class-nur", subject: "Urdu Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-nur-evs", courseId: "bundle-nursery", productId: "seed-extra-nur-evs-copy", itemType: "notebook", itemName: "EVS Copy", quantity: 1, price: 32, classId: "class-nur", subject: "EVS Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-nur-art", courseId: "bundle-nursery", productId: "seed-extra-nur-art-copy", itemType: "notebook", itemName: "Art Copy", quantity: 1, price: 32, classId: "class-nur", subject: "Art Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-nur-pencil-box", courseId: "bundle-nursery", productId: "seed-extra-pg-pencil-box", itemType: "stationery", itemName: "Pencil Box", quantity: 1, price: 50, classId: "class-nur", subject: "Pencil Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-nur-crayons", courseId: "bundle-nursery", productId: "seed-extra-pg-crayons", itemType: "stationery", itemName: "Crayons", quantity: 1, price: 10, classId: "class-nur", subject: "Crayons", createdAt: new Date().toISOString() },
  { id: "bundle-item-nur-blue-pencil", courseId: "bundle-nursery", productId: "seed-extra-pg-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 5, classId: "class-nur", subject: "Blue Pencil", createdAt: new Date().toISOString() },
  { id: "bundle-item-nur-charts", courseId: "bundle-nursery", productId: "seed-extra-pg-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 10, classId: "class-nur", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-nur-glue", courseId: "bundle-nursery", productId: "seed-extra-pg-glue", itemType: "stationery", itemName: "Glue", quantity: 1, price: 10, classId: "class-nur", subject: "Glue", createdAt: new Date().toISOString() },

  { id: "bundle-item-kg-hindi", courseId: "bundle-kg", productId: "seed-extra-nur-hindi-copy", itemType: "notebook", itemName: "Hindi Copy", quantity: 2, price: 32, classId: "class-kg", subject: "Hindi Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-kg-english", courseId: "bundle-kg", productId: "seed-extra-nur-english-copy", itemType: "notebook", itemName: "English Copy", quantity: 2, price: 32, classId: "class-kg", subject: "English Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-kg-math", courseId: "bundle-kg", productId: "seed-extra-nur-math-copy", itemType: "notebook", itemName: "Math Copy", quantity: 2, price: 32, classId: "class-kg", subject: "Math Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-kg-urdu", courseId: "bundle-kg", productId: "seed-extra-nur-urdu-copy", itemType: "notebook", itemName: "Urdu Copy", quantity: 2, price: 32, classId: "class-kg", subject: "Urdu Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-kg-evs", courseId: "bundle-kg", productId: "seed-extra-nur-evs-copy", itemType: "notebook", itemName: "EVS Copy", quantity: 1, price: 32, classId: "class-kg", subject: "EVS Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-kg-art", courseId: "bundle-kg", productId: "seed-extra-nur-art-copy", itemType: "notebook", itemName: "Art Copy", quantity: 1, price: 32, classId: "class-kg", subject: "Art Copy", createdAt: new Date().toISOString() },
  { id: "bundle-item-kg-pencil-box", courseId: "bundle-kg", productId: "seed-extra-pg-pencil-box", itemType: "stationery", itemName: "Pencil Box", quantity: 1, price: 50, classId: "class-kg", subject: "Pencil Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-kg-crayons", courseId: "bundle-kg", productId: "seed-extra-pg-crayons", itemType: "stationery", itemName: "Crayons", quantity: 1, price: 10, classId: "class-kg", subject: "Crayons", createdAt: new Date().toISOString() },
  { id: "bundle-item-kg-blue-pencil", courseId: "bundle-kg", productId: "seed-extra-pg-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 5, classId: "class-kg", subject: "Blue Pencil", createdAt: new Date().toISOString() },
  { id: "bundle-item-kg-charts", courseId: "bundle-kg", productId: "seed-extra-pg-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 10, classId: "class-kg", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-kg-glue", courseId: "bundle-kg", productId: "seed-extra-pg-glue", itemType: "stationery", itemName: "Glue", quantity: 1, price: 10, classId: "class-kg", subject: "Glue", createdAt: new Date().toISOString() },

  { id: "bundle-item-c1-hindi-regular", courseId: "bundle-class-1", productId: "seed-extra-1to5-hindi-regular", itemType: "notebook", itemName: "Hindi Copy", quantity: 2, price: 32, classId: "class-1", subject: "Hindi", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-english-regular", courseId: "bundle-class-1", productId: "seed-extra-1to5-english-regular", itemType: "notebook", itemName: "English Copy", quantity: 2, price: 0, classId: "class-1", subject: "English", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-math-regular", courseId: "bundle-class-1", productId: "seed-extra-1to5-math-regular", itemType: "notebook", itemName: "Math Copy", quantity: 2, price: 0, classId: "class-1", subject: "Math", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-urdu-regular", courseId: "bundle-class-1", productId: "seed-extra-1to5-urdu-regular", itemType: "notebook", itemName: "Urdu Copy", quantity: 1, price: 0, classId: "class-1", subject: "Urdu", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-science-regular", courseId: "bundle-class-1", productId: "seed-extra-1to5-science-regular", itemType: "notebook", itemName: "Science Copy", quantity: 1, price: 0, classId: "class-1", subject: "Science", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-computer-regular", courseId: "bundle-class-1", productId: "seed-extra-1to5-computer-small", itemType: "notebook", itemName: "Computer Small Copy", quantity: 1, price: 0, classId: "class-1", subject: "Computer", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-gk-regular", courseId: "bundle-class-1", productId: "seed-extra-1to5-gk-small", itemType: "notebook", itemName: "GK Small Copy", quantity: 1, price: 0, classId: "class-1", subject: "GK", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-islamic-regular", courseId: "bundle-class-1", productId: "seed-extra-1to5-islamic-small", itemType: "notebook", itemName: "Islamic Studies Small Copy", quantity: 1, price: 0, classId: "class-1", subject: "Islamic Studies", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-sst-regular", courseId: "bundle-class-1", productId: "seed-extra-1to5-sst-regular", itemType: "notebook", itemName: "SST Copy", quantity: 1, price: 0, classId: "class-1", subject: "SST", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-art-regular", courseId: "bundle-class-1", productId: "seed-extra-1to5-art-regular", itemType: "notebook", itemName: "Art Copy", quantity: 1, price: 0, classId: "class-1", subject: "Art", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-hindi-test", courseId: "bundle-class-1", productId: "seed-extra-1to5-hindi-test", itemType: "notebook", itemName: "Hindi Test Copy", quantity: 1, price: 0, classId: "class-1", subject: "Hindi Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-english-test", courseId: "bundle-class-1", productId: "seed-extra-1to5-english-test", itemType: "notebook", itemName: "English Test Copy", quantity: 1, price: 0, classId: "class-1", subject: "English Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-math-test", courseId: "bundle-class-1", productId: "seed-extra-1to5-math-test", itemType: "notebook", itemName: "Math Test Copy", quantity: 1, price: 0, classId: "class-1", subject: "Math Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-urdu-test", courseId: "bundle-class-1", productId: "seed-extra-1to5-urdu-test", itemType: "notebook", itemName: "Urdu Test Copy", quantity: 1, price: 0, classId: "class-1", subject: "Urdu Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-computer-test", courseId: "bundle-class-1", productId: "seed-extra-1to5-computer-test", itemType: "notebook", itemName: "Computer Test Copy", quantity: 1, price: 0, classId: "class-1", subject: "Computer Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-gk-test", courseId: "bundle-class-1", productId: "seed-extra-1to5-gk-test", itemType: "notebook", itemName: "GK Test Copy", quantity: 1, price: 0, classId: "class-1", subject: "GK Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-islamic-test", courseId: "bundle-class-1", productId: "seed-extra-1to5-islamic-test", itemType: "notebook", itemName: "Islamic Studies Test Copy", quantity: 1, price: 0, classId: "class-1", subject: "Islamic Studies Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-sst-test", courseId: "bundle-class-1", productId: "seed-extra-1to5-sst-test", itemType: "notebook", itemName: "SST Test Copy", quantity: 1, price: 0, classId: "class-1", subject: "SST Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-science-test", courseId: "bundle-class-1", productId: "seed-extra-1to5-science-test", itemType: "notebook", itemName: "Science Test Copy", quantity: 1, price: 0, classId: "class-1", subject: "Science Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-charts", courseId: "bundle-class-1", productId: "seed-extra-1to5-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 0, classId: "class-1", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-glue", courseId: "bundle-class-1", productId: "seed-extra-1to5-glue-sticks", itemType: "stationery", itemName: "Glue Sticks", quantity: 10, price: 0, classId: "class-1", subject: "Glue Sticks", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-pencil-box", courseId: "bundle-class-1", productId: "seed-extra-1to5-pencil-box", itemType: "stationery", itemName: "Pencil Box", quantity: 1, price: 0, classId: "class-1", subject: "Pencil Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-colours", courseId: "bundle-class-1", productId: "seed-extra-1to5-colours", itemType: "stationery", itemName: "Colour / Crayons", quantity: 1, price: 0, classId: "class-1", subject: "Colour / Crayons", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-blue-pencil", courseId: "bundle-class-1", productId: "seed-extra-1to5-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 0, classId: "class-1", subject: "Blue Pencil", createdAt: new Date().toISOString() },
  { id: "bundle-item-c1-scale", courseId: "bundle-class-1", productId: "seed-extra-1to5-scale", itemType: "stationery", itemName: "Scale", quantity: 1, price: 0, classId: "class-1", subject: "Scale", createdAt: new Date().toISOString() },

  { id: "bundle-item-c2-hindi-regular", courseId: "bundle-class-2", productId: "seed-extra-1to5-hindi-regular", itemType: "notebook", itemName: "Hindi Copy", quantity: 2, price: 0, classId: "class-2", subject: "Hindi", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-english-regular", courseId: "bundle-class-2", productId: "seed-extra-1to5-english-regular", itemType: "notebook", itemName: "English Copy", quantity: 2, price: 0, classId: "class-2", subject: "English", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-math-regular", courseId: "bundle-class-2", productId: "seed-extra-1to5-math-regular", itemType: "notebook", itemName: "Math Copy", quantity: 2, price: 0, classId: "class-2", subject: "Math", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-urdu-regular", courseId: "bundle-class-2", productId: "seed-extra-1to5-urdu-regular", itemType: "notebook", itemName: "Urdu Copy", quantity: 1, price: 0, classId: "class-2", subject: "Urdu", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-science-regular", courseId: "bundle-class-2", productId: "seed-extra-1to5-science-regular", itemType: "notebook", itemName: "Science Copy", quantity: 1, price: 0, classId: "class-2", subject: "Science", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-computer-regular", courseId: "bundle-class-2", productId: "seed-extra-1to5-computer-small", itemType: "notebook", itemName: "Computer Small Copy", quantity: 1, price: 0, classId: "class-2", subject: "Computer", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-gk-regular", courseId: "bundle-class-2", productId: "seed-extra-1to5-gk-small", itemType: "notebook", itemName: "GK Small Copy", quantity: 1, price: 0, classId: "class-2", subject: "GK", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-islamic-regular", courseId: "bundle-class-2", productId: "seed-extra-1to5-islamic-small", itemType: "notebook", itemName: "Islamic Studies Small Copy", quantity: 1, price: 0, classId: "class-2", subject: "Islamic Studies", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-sst-regular", courseId: "bundle-class-2", productId: "seed-extra-1to5-sst-regular", itemType: "notebook", itemName: "SST Copy", quantity: 1, price: 0, classId: "class-2", subject: "SST", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-art-regular", courseId: "bundle-class-2", productId: "seed-extra-1to5-art-regular", itemType: "notebook", itemName: "Art Copy", quantity: 1, price: 0, classId: "class-2", subject: "Art", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-hindi-test", courseId: "bundle-class-2", productId: "seed-extra-1to5-hindi-test", itemType: "notebook", itemName: "Hindi Test Copy", quantity: 1, price: 0, classId: "class-2", subject: "Hindi Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-english-test", courseId: "bundle-class-2", productId: "seed-extra-1to5-english-test", itemType: "notebook", itemName: "English Test Copy", quantity: 1, price: 0, classId: "class-2", subject: "English Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-math-test", courseId: "bundle-class-2", productId: "seed-extra-1to5-math-test", itemType: "notebook", itemName: "Math Test Copy", quantity: 1, price: 0, classId: "class-2", subject: "Math Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-urdu-test", courseId: "bundle-class-2", productId: "seed-extra-1to5-urdu-test", itemType: "notebook", itemName: "Urdu Test Copy", quantity: 1, price: 0, classId: "class-2", subject: "Urdu Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-computer-test", courseId: "bundle-class-2", productId: "seed-extra-1to5-computer-test", itemType: "notebook", itemName: "Computer Test Copy", quantity: 1, price: 0, classId: "class-2", subject: "Computer Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-gk-test", courseId: "bundle-class-2", productId: "seed-extra-1to5-gk-test", itemType: "notebook", itemName: "GK Test Copy", quantity: 1, price: 0, classId: "class-2", subject: "GK Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-islamic-test", courseId: "bundle-class-2", productId: "seed-extra-1to5-islamic-test", itemType: "notebook", itemName: "Islamic Studies Test Copy", quantity: 1, price: 0, classId: "class-2", subject: "Islamic Studies Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-sst-test", courseId: "bundle-class-2", productId: "seed-extra-1to5-sst-test", itemType: "notebook", itemName: "SST Test Copy", quantity: 1, price: 0, classId: "class-2", subject: "SST Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-science-test", courseId: "bundle-class-2", productId: "seed-extra-1to5-science-test", itemType: "notebook", itemName: "Science Test Copy", quantity: 1, price: 0, classId: "class-2", subject: "Science Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-charts", courseId: "bundle-class-2", productId: "seed-extra-1to5-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 0, classId: "class-2", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-glue", courseId: "bundle-class-2", productId: "seed-extra-1to5-glue-sticks", itemType: "stationery", itemName: "Glue Sticks", quantity: 10, price: 0, classId: "class-2", subject: "Glue Sticks", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-pencil-box", courseId: "bundle-class-2", productId: "seed-extra-1to5-pencil-box", itemType: "stationery", itemName: "Pencil Box", quantity: 1, price: 0, classId: "class-2", subject: "Pencil Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-colours", courseId: "bundle-class-2", productId: "seed-extra-1to5-colours", itemType: "stationery", itemName: "Colour / Crayons", quantity: 1, price: 0, classId: "class-2", subject: "Colour / Crayons", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-blue-pencil", courseId: "bundle-class-2", productId: "seed-extra-1to5-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 0, classId: "class-2", subject: "Blue Pencil", createdAt: new Date().toISOString() },
  { id: "bundle-item-c2-scale", courseId: "bundle-class-2", productId: "seed-extra-1to5-scale", itemType: "stationery", itemName: "Scale", quantity: 1, price: 0, classId: "class-2", subject: "Scale", createdAt: new Date().toISOString() },

  { id: "bundle-item-c3-hindi-regular", courseId: "bundle-class-3", productId: "seed-extra-1to5-hindi-regular", itemType: "notebook", itemName: "Hindi Copy", quantity: 2, price: 0, classId: "class-3", subject: "Hindi", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-english-regular", courseId: "bundle-class-3", productId: "seed-extra-1to5-english-regular", itemType: "notebook", itemName: "English Copy", quantity: 2, price: 0, classId: "class-3", subject: "English", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-math-regular", courseId: "bundle-class-3", productId: "seed-extra-1to5-math-regular", itemType: "notebook", itemName: "Math Copy", quantity: 2, price: 0, classId: "class-3", subject: "Math", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-urdu-regular", courseId: "bundle-class-3", productId: "seed-extra-1to5-urdu-regular", itemType: "notebook", itemName: "Urdu Copy", quantity: 1, price: 0, classId: "class-3", subject: "Urdu", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-science-regular", courseId: "bundle-class-3", productId: "seed-extra-1to5-science-regular", itemType: "notebook", itemName: "Science Copy", quantity: 1, price: 0, classId: "class-3", subject: "Science", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-computer-regular", courseId: "bundle-class-3", productId: "seed-extra-1to5-computer-small", itemType: "notebook", itemName: "Computer Small Copy", quantity: 1, price: 0, classId: "class-3", subject: "Computer", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-gk-regular", courseId: "bundle-class-3", productId: "seed-extra-1to5-gk-small", itemType: "notebook", itemName: "GK Small Copy", quantity: 1, price: 0, classId: "class-3", subject: "GK", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-islamic-regular", courseId: "bundle-class-3", productId: "seed-extra-1to5-islamic-small", itemType: "notebook", itemName: "Islamic Studies Small Copy", quantity: 1, price: 0, classId: "class-3", subject: "Islamic Studies", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-sst-regular", courseId: "bundle-class-3", productId: "seed-extra-1to5-sst-regular", itemType: "notebook", itemName: "SST Copy", quantity: 1, price: 0, classId: "class-3", subject: "SST", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-art-regular", courseId: "bundle-class-3", productId: "seed-extra-1to5-art-regular", itemType: "notebook", itemName: "Art Copy", quantity: 1, price: 0, classId: "class-3", subject: "Art", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-hindi-test", courseId: "bundle-class-3", productId: "seed-extra-1to5-hindi-test", itemType: "notebook", itemName: "Hindi Test Copy", quantity: 1, price: 0, classId: "class-3", subject: "Hindi Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-english-test", courseId: "bundle-class-3", productId: "seed-extra-1to5-english-test", itemType: "notebook", itemName: "English Test Copy", quantity: 1, price: 0, classId: "class-3", subject: "English Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-math-test", courseId: "bundle-class-3", productId: "seed-extra-1to5-math-test", itemType: "notebook", itemName: "Math Test Copy", quantity: 1, price: 0, classId: "class-3", subject: "Math Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-urdu-test", courseId: "bundle-class-3", productId: "seed-extra-1to5-urdu-test", itemType: "notebook", itemName: "Urdu Test Copy", quantity: 1, price: 0, classId: "class-3", subject: "Urdu Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-computer-test", courseId: "bundle-class-3", productId: "seed-extra-1to5-computer-test", itemType: "notebook", itemName: "Computer Test Copy", quantity: 1, price: 0, classId: "class-3", subject: "Computer Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-gk-test", courseId: "bundle-class-3", productId: "seed-extra-1to5-gk-test", itemType: "notebook", itemName: "GK Test Copy", quantity: 1, price: 0, classId: "class-3", subject: "GK Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-islamic-test", courseId: "bundle-class-3", productId: "seed-extra-1to5-islamic-test", itemType: "notebook", itemName: "Islamic Studies Test Copy", quantity: 1, price: 0, classId: "class-3", subject: "Islamic Studies Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-sst-test", courseId: "bundle-class-3", productId: "seed-extra-1to5-sst-test", itemType: "notebook", itemName: "SST Test Copy", quantity: 1, price: 0, classId: "class-3", subject: "SST Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-science-test", courseId: "bundle-class-3", productId: "seed-extra-1to5-science-test", itemType: "notebook", itemName: "Science Test Copy", quantity: 1, price: 0, classId: "class-3", subject: "Science Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-charts", courseId: "bundle-class-3", productId: "seed-extra-1to5-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 0, classId: "class-3", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-glue", courseId: "bundle-class-3", productId: "seed-extra-1to5-glue-sticks", itemType: "stationery", itemName: "Glue Sticks", quantity: 10, price: 0, classId: "class-3", subject: "Glue Sticks", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-pencil-box", courseId: "bundle-class-3", productId: "seed-extra-1to5-pencil-box", itemType: "stationery", itemName: "Pencil Box", quantity: 1, price: 0, classId: "class-3", subject: "Pencil Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-colours", courseId: "bundle-class-3", productId: "seed-extra-1to5-colours", itemType: "stationery", itemName: "Colour / Crayons", quantity: 1, price: 0, classId: "class-3", subject: "Colour / Crayons", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-blue-pencil", courseId: "bundle-class-3", productId: "seed-extra-1to5-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 0, classId: "class-3", subject: "Blue Pencil", createdAt: new Date().toISOString() },
  { id: "bundle-item-c3-scale", courseId: "bundle-class-3", productId: "seed-extra-1to5-scale", itemType: "stationery", itemName: "Scale", quantity: 1, price: 0, classId: "class-3", subject: "Scale", createdAt: new Date().toISOString() },

  { id: "bundle-item-c4-hindi-regular", courseId: "bundle-class-4", productId: "seed-extra-1to5-hindi-regular", itemType: "notebook", itemName: "Hindi Copy", quantity: 2, price: 0, classId: "class-4", subject: "Hindi", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-english-regular", courseId: "bundle-class-4", productId: "seed-extra-1to5-english-regular", itemType: "notebook", itemName: "English Copy", quantity: 2, price: 0, classId: "class-4", subject: "English", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-math-regular", courseId: "bundle-class-4", productId: "seed-extra-1to5-math-regular", itemType: "notebook", itemName: "Math Copy", quantity: 2, price: 0, classId: "class-4", subject: "Math", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-urdu-regular", courseId: "bundle-class-4", productId: "seed-extra-1to5-urdu-regular", itemType: "notebook", itemName: "Urdu Copy", quantity: 1, price: 0, classId: "class-4", subject: "Urdu", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-science-regular", courseId: "bundle-class-4", productId: "seed-extra-1to5-science-regular", itemType: "notebook", itemName: "Science Copy", quantity: 1, price: 0, classId: "class-4", subject: "Science", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-computer-regular", courseId: "bundle-class-4", productId: "seed-extra-1to5-computer-small", itemType: "notebook", itemName: "Computer Small Copy", quantity: 1, price: 0, classId: "class-4", subject: "Computer", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-gk-regular", courseId: "bundle-class-4", productId: "seed-extra-1to5-gk-small", itemType: "notebook", itemName: "GK Small Copy", quantity: 1, price: 0, classId: "class-4", subject: "GK", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-islamic-regular", courseId: "bundle-class-4", productId: "seed-extra-1to5-islamic-small", itemType: "notebook", itemName: "Islamic Studies Small Copy", quantity: 1, price: 0, classId: "class-4", subject: "Islamic Studies", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-sst-regular", courseId: "bundle-class-4", productId: "seed-extra-1to5-sst-regular", itemType: "notebook", itemName: "SST Copy", quantity: 1, price: 0, classId: "class-4", subject: "SST", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-art-regular", courseId: "bundle-class-4", productId: "seed-extra-1to5-art-regular", itemType: "notebook", itemName: "Art Copy", quantity: 1, price: 0, classId: "class-4", subject: "Art", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-hindi-test", courseId: "bundle-class-4", productId: "seed-extra-1to5-hindi-test", itemType: "notebook", itemName: "Hindi Test Copy", quantity: 1, price: 0, classId: "class-4", subject: "Hindi Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-english-test", courseId: "bundle-class-4", productId: "seed-extra-1to5-english-test", itemType: "notebook", itemName: "English Test Copy", quantity: 1, price: 0, classId: "class-4", subject: "English Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-math-test", courseId: "bundle-class-4", productId: "seed-extra-1to5-math-test", itemType: "notebook", itemName: "Math Test Copy", quantity: 1, price: 0, classId: "class-4", subject: "Math Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-urdu-test", courseId: "bundle-class-4", productId: "seed-extra-1to5-urdu-test", itemType: "notebook", itemName: "Urdu Test Copy", quantity: 1, price: 0, classId: "class-4", subject: "Urdu Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-computer-test", courseId: "bundle-class-4", productId: "seed-extra-1to5-computer-test", itemType: "notebook", itemName: "Computer Test Copy", quantity: 1, price: 0, classId: "class-4", subject: "Computer Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-gk-test", courseId: "bundle-class-4", productId: "seed-extra-1to5-gk-test", itemType: "notebook", itemName: "GK Test Copy", quantity: 1, price: 0, classId: "class-4", subject: "GK Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-islamic-test", courseId: "bundle-class-4", productId: "seed-extra-1to5-islamic-test", itemType: "notebook", itemName: "Islamic Studies Test Copy", quantity: 1, price: 0, classId: "class-4", subject: "Islamic Studies Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-sst-test", courseId: "bundle-class-4", productId: "seed-extra-1to5-sst-test", itemType: "notebook", itemName: "SST Test Copy", quantity: 1, price: 0, classId: "class-4", subject: "SST Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-science-test", courseId: "bundle-class-4", productId: "seed-extra-1to5-science-test", itemType: "notebook", itemName: "Science Test Copy", quantity: 1, price: 0, classId: "class-4", subject: "Science Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-charts", courseId: "bundle-class-4", productId: "seed-extra-1to5-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 0, classId: "class-4", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-glue", courseId: "bundle-class-4", productId: "seed-extra-1to5-glue-sticks", itemType: "stationery", itemName: "Glue Sticks", quantity: 10, price: 0, classId: "class-4", subject: "Glue Sticks", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-pencil-box", courseId: "bundle-class-4", productId: "seed-extra-1to5-pencil-box", itemType: "stationery", itemName: "Pencil Box", quantity: 1, price: 0, classId: "class-4", subject: "Pencil Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-colours", courseId: "bundle-class-4", productId: "seed-extra-1to5-colours", itemType: "stationery", itemName: "Colour / Crayons", quantity: 1, price: 0, classId: "class-4", subject: "Colour / Crayons", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-blue-pencil", courseId: "bundle-class-4", productId: "seed-extra-1to5-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 0, classId: "class-4", subject: "Blue Pencil", createdAt: new Date().toISOString() },
  { id: "bundle-item-c4-scale", courseId: "bundle-class-4", productId: "seed-extra-1to5-scale", itemType: "stationery", itemName: "Scale", quantity: 1, price: 0, classId: "class-4", subject: "Scale", createdAt: new Date().toISOString() },

  { id: "bundle-item-c5-hindi-regular", courseId: "bundle-class-5", productId: "seed-extra-1to5-hindi-regular", itemType: "notebook", itemName: "Hindi Copy", quantity: 2, price: 0, classId: "class-5", subject: "Hindi", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-english-regular", courseId: "bundle-class-5", productId: "seed-extra-1to5-english-regular", itemType: "notebook", itemName: "English Copy", quantity: 2, price: 0, classId: "class-5", subject: "English", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-math-regular", courseId: "bundle-class-5", productId: "seed-extra-1to5-math-regular", itemType: "notebook", itemName: "Math Copy", quantity: 2, price: 0, classId: "class-5", subject: "Math", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-urdu-regular", courseId: "bundle-class-5", productId: "seed-extra-1to5-urdu-regular", itemType: "notebook", itemName: "Urdu Copy", quantity: 1, price: 0, classId: "class-5", subject: "Urdu", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-science-regular", courseId: "bundle-class-5", productId: "seed-extra-1to5-science-regular", itemType: "notebook", itemName: "Science Copy", quantity: 1, price: 0, classId: "class-5", subject: "Science", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-computer-regular", courseId: "bundle-class-5", productId: "seed-extra-1to5-computer-small", itemType: "notebook", itemName: "Computer Small Copy", quantity: 1, price: 0, classId: "class-5", subject: "Computer", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-gk-regular", courseId: "bundle-class-5", productId: "seed-extra-1to5-gk-small", itemType: "notebook", itemName: "GK Small Copy", quantity: 1, price: 0, classId: "class-5", subject: "GK", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-islamic-regular", courseId: "bundle-class-5", productId: "seed-extra-1to5-islamic-small", itemType: "notebook", itemName: "Islamic Studies Small Copy", quantity: 1, price: 0, classId: "class-5", subject: "Islamic Studies", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-sst-regular", courseId: "bundle-class-5", productId: "seed-extra-1to5-sst-regular", itemType: "notebook", itemName: "SST Copy", quantity: 1, price: 0, classId: "class-5", subject: "SST", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-art-regular", courseId: "bundle-class-5", productId: "seed-extra-1to5-art-regular", itemType: "notebook", itemName: "Art Copy", quantity: 1, price: 0, classId: "class-5", subject: "Art", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-hindi-test", courseId: "bundle-class-5", productId: "seed-extra-1to5-hindi-test", itemType: "notebook", itemName: "Hindi Test Copy", quantity: 1, price: 0, classId: "class-5", subject: "Hindi Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-english-test", courseId: "bundle-class-5", productId: "seed-extra-1to5-english-test", itemType: "notebook", itemName: "English Test Copy", quantity: 1, price: 0, classId: "class-5", subject: "English Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-math-test", courseId: "bundle-class-5", productId: "seed-extra-1to5-math-test", itemType: "notebook", itemName: "Math Test Copy", quantity: 1, price: 0, classId: "class-5", subject: "Math Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-urdu-test", courseId: "bundle-class-5", productId: "seed-extra-1to5-urdu-test", itemType: "notebook", itemName: "Urdu Test Copy", quantity: 1, price: 0, classId: "class-5", subject: "Urdu Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-computer-test", courseId: "bundle-class-5", productId: "seed-extra-1to5-computer-test", itemType: "notebook", itemName: "Computer Test Copy", quantity: 1, price: 0, classId: "class-5", subject: "Computer Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-gk-test", courseId: "bundle-class-5", productId: "seed-extra-1to5-gk-test", itemType: "notebook", itemName: "GK Test Copy", quantity: 1, price: 0, classId: "class-5", subject: "GK Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-islamic-test", courseId: "bundle-class-5", productId: "seed-extra-1to5-islamic-test", itemType: "notebook", itemName: "Islamic Studies Test Copy", quantity: 1, price: 0, classId: "class-5", subject: "Islamic Studies Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-sst-test", courseId: "bundle-class-5", productId: "seed-extra-1to5-sst-test", itemType: "notebook", itemName: "SST Test Copy", quantity: 1, price: 0, classId: "class-5", subject: "SST Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-science-test", courseId: "bundle-class-5", productId: "seed-extra-1to5-science-test", itemType: "notebook", itemName: "Science Test Copy", quantity: 1, price: 0, classId: "class-5", subject: "Science Test", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-charts", courseId: "bundle-class-5", productId: "seed-extra-1to5-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 0, classId: "class-5", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-glue", courseId: "bundle-class-5", productId: "seed-extra-1to5-glue-sticks", itemType: "stationery", itemName: "Glue Sticks", quantity: 10, price: 0, classId: "class-5", subject: "Glue Sticks", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-pencil-box", courseId: "bundle-class-5", productId: "seed-extra-1to5-pencil-box", itemType: "stationery", itemName: "Pencil Box", quantity: 1, price: 0, classId: "class-5", subject: "Pencil Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-colours", courseId: "bundle-class-5", productId: "seed-extra-1to5-colours", itemType: "stationery", itemName: "Colour / Crayons", quantity: 1, price: 0, classId: "class-5", subject: "Colour / Crayons", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-blue-pencil", courseId: "bundle-class-5", productId: "seed-extra-1to5-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 0, classId: "class-5", subject: "Blue Pencil", createdAt: new Date().toISOString() },
  { id: "bundle-item-c5-scale", courseId: "bundle-class-5", productId: "seed-extra-1to5-scale", itemType: "stationery", itemName: "Scale", quantity: 1, price: 0, classId: "class-5", subject: "Scale", createdAt: new Date().toISOString() },

  { id: "bundle-item-c6-hindi-register", courseId: "bundle-class-6", productId: "seed-extra-6to8-hindi-register", itemType: "notebook", itemName: "Hindi Register", quantity: 2, price: 0, classId: "class-6", subject: "Hindi", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-english-register", courseId: "bundle-class-6", productId: "seed-extra-6to8-english-register", itemType: "notebook", itemName: "English Register", quantity: 2, price: 0, classId: "class-6", subject: "English", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-math-register", courseId: "bundle-class-6", productId: "seed-extra-6to8-math-register", itemType: "notebook", itemName: "Math Register", quantity: 1, price: 0, classId: "class-6", subject: "Math", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-urdu-register", courseId: "bundle-class-6", productId: "seed-extra-6to8-urdu-register", itemType: "notebook", itemName: "Urdu Register", quantity: 1, price: 0, classId: "class-6", subject: "Urdu", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-science-register", courseId: "bundle-class-6", productId: "seed-extra-6to8-science-register", itemType: "notebook", itemName: "Science Register", quantity: 1, price: 0, classId: "class-6", subject: "Science", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-computer-register", courseId: "bundle-class-6", productId: "seed-extra-6to8-computer-register", itemType: "notebook", itemName: "Computer Register", quantity: 1, price: 0, classId: "class-6", subject: "Computer", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-gk-register", courseId: "bundle-class-6", productId: "seed-extra-6to8-gk-small-register", itemType: "notebook", itemName: "GK Small Register", quantity: 1, price: 0, classId: "class-6", subject: "GK", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-sst-register", courseId: "bundle-class-6", productId: "seed-extra-6to8-sst-register", itemType: "notebook", itemName: "SST Register", quantity: 1, price: 0, classId: "class-6", subject: "SST", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-art-register", courseId: "bundle-class-6", productId: "seed-extra-6to8-art-register", itemType: "notebook", itemName: "Art Copy", quantity: 1, price: 20, classId: "class-6", subject: "Art", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-blue-pen", courseId: "bundle-class-6", productId: "seed-extra-6to8-blue-pen", itemType: "stationery", itemName: "Blue Pen", quantity: 1, price: 0, classId: "class-6", subject: "Blue Pen", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-black-pen", courseId: "bundle-class-6", productId: "seed-extra-6to8-black-pen", itemType: "stationery", itemName: "Black Pen", quantity: 1, price: 0, classId: "class-6", subject: "Black Pen", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-geometry", courseId: "bundle-class-6", productId: "seed-extra-6to8-geometry-box", itemType: "stationery", itemName: "Geometry Box", quantity: 1, price: 0, classId: "class-6", subject: "Geometry Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-charts", courseId: "bundle-class-6", productId: "seed-extra-6to8-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 0, classId: "class-6", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-glue", courseId: "bundle-class-6", productId: "seed-extra-6to8-glue", itemType: "stationery", itemName: "Glue", quantity: 1, price: 0, classId: "class-6", subject: "Glue", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-scissors", courseId: "bundle-class-6", productId: "seed-extra-6to8-scissors", itemType: "stationery", itemName: "Scissors", quantity: 1, price: 0, classId: "class-6", subject: "Scissors", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-water-colours", courseId: "bundle-class-6", productId: "seed-extra-6to8-water-colours", itemType: "stationery", itemName: "Water Colours", quantity: 1, price: 0, classId: "class-6", subject: "Water Colours", createdAt: new Date().toISOString() },
  { id: "bundle-item-c6-blue-pencil", courseId: "bundle-class-6", productId: "seed-extra-6to8-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 0, classId: "class-6", subject: "Blue Pencil", createdAt: new Date().toISOString() },

  { id: "bundle-item-c7-hindi-register", courseId: "bundle-class-7", productId: "seed-extra-6to8-hindi-register", itemType: "notebook", itemName: "Hindi Register", quantity: 2, price: 0, classId: "class-7", subject: "Hindi", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-english-register", courseId: "bundle-class-7", productId: "seed-extra-6to8-english-register", itemType: "notebook", itemName: "English Register", quantity: 2, price: 0, classId: "class-7", subject: "English", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-math-register", courseId: "bundle-class-7", productId: "seed-extra-6to8-math-register", itemType: "notebook", itemName: "Math Register", quantity: 1, price: 0, classId: "class-7", subject: "Math", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-urdu-register", courseId: "bundle-class-7", productId: "seed-extra-6to8-urdu-register", itemType: "notebook", itemName: "Urdu Register", quantity: 1, price: 0, classId: "class-7", subject: "Urdu", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-science-register", courseId: "bundle-class-7", productId: "seed-extra-6to8-science-register", itemType: "notebook", itemName: "Science Register", quantity: 1, price: 0, classId: "class-7", subject: "Science", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-computer-register", courseId: "bundle-class-7", productId: "seed-extra-6to8-computer-register", itemType: "notebook", itemName: "Computer Register", quantity: 1, price: 0, classId: "class-7", subject: "Computer", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-gk-register", courseId: "bundle-class-7", productId: "seed-extra-6to8-gk-small-register", itemType: "notebook", itemName: "GK Small Register", quantity: 1, price: 0, classId: "class-7", subject: "GK", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-sst-register", courseId: "bundle-class-7", productId: "seed-extra-6to8-sst-register", itemType: "notebook", itemName: "SST Register", quantity: 1, price: 0, classId: "class-7", subject: "SST", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-art-register", courseId: "bundle-class-7", productId: "seed-extra-6to8-art-register", itemType: "notebook", itemName: "Art Register", quantity: 1, price: 0, classId: "class-7", subject: "Art", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-blue-pen", courseId: "bundle-class-7", productId: "seed-extra-6to8-blue-pen", itemType: "stationery", itemName: "Blue Pen", quantity: 1, price: 0, classId: "class-7", subject: "Blue Pen", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-black-pen", courseId: "bundle-class-7", productId: "seed-extra-6to8-black-pen", itemType: "stationery", itemName: "Black Pen", quantity: 1, price: 0, classId: "class-7", subject: "Black Pen", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-geometry", courseId: "bundle-class-7", productId: "seed-extra-6to8-geometry-box", itemType: "stationery", itemName: "Geometry Box", quantity: 1, price: 0, classId: "class-7", subject: "Geometry Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-charts", courseId: "bundle-class-7", productId: "seed-extra-6to8-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 0, classId: "class-7", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-glue", courseId: "bundle-class-7", productId: "seed-extra-6to8-glue", itemType: "stationery", itemName: "Glue", quantity: 1, price: 0, classId: "class-7", subject: "Glue", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-scissors", courseId: "bundle-class-7", productId: "seed-extra-6to8-scissors", itemType: "stationery", itemName: "Scissors", quantity: 1, price: 0, classId: "class-7", subject: "Scissors", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-water-colours", courseId: "bundle-class-7", productId: "seed-extra-6to8-water-colours", itemType: "stationery", itemName: "Water Colours", quantity: 1, price: 0, classId: "class-7", subject: "Water Colours", createdAt: new Date().toISOString() },
  { id: "bundle-item-c7-blue-pencil", courseId: "bundle-class-7", productId: "seed-extra-6to8-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 0, classId: "class-7", subject: "Blue Pencil", createdAt: new Date().toISOString() },

  { id: "bundle-item-c8-hindi-register", courseId: "bundle-class-8", productId: "seed-extra-6to8-hindi-register", itemType: "notebook", itemName: "Hindi Register", quantity: 2, price: 0, classId: "class-8", subject: "Hindi", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-english-register", courseId: "bundle-class-8", productId: "seed-extra-6to8-english-register", itemType: "notebook", itemName: "English Register", quantity: 2, price: 0, classId: "class-8", subject: "English", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-math-register", courseId: "bundle-class-8", productId: "seed-extra-6to8-math-register", itemType: "notebook", itemName: "Math Register", quantity: 1, price: 0, classId: "class-8", subject: "Math", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-urdu-register", courseId: "bundle-class-8", productId: "seed-extra-6to8-urdu-register", itemType: "notebook", itemName: "Urdu Register", quantity: 1, price: 0, classId: "class-8", subject: "Urdu", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-science-register", courseId: "bundle-class-8", productId: "seed-extra-6to8-science-register", itemType: "notebook", itemName: "Science Register", quantity: 1, price: 0, classId: "class-8", subject: "Science", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-computer-register", courseId: "bundle-class-8", productId: "seed-extra-6to8-computer-register", itemType: "notebook", itemName: "Computer Register", quantity: 1, price: 0, classId: "class-8", subject: "Computer", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-gk-register", courseId: "bundle-class-8", productId: "seed-extra-6to8-gk-small-register", itemType: "notebook", itemName: "GK Small Register", quantity: 1, price: 0, classId: "class-8", subject: "GK", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-sst-register", courseId: "bundle-class-8", productId: "seed-extra-6to8-sst-register", itemType: "notebook", itemName: "SST Register", quantity: 1, price: 0, classId: "class-8", subject: "SST", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-art-register", courseId: "bundle-class-8", productId: "seed-extra-6to8-art-register", itemType: "notebook", itemName: "Art Copy", quantity: 1, price: 20, classId: "class-8", subject: "Art", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-blue-pen", courseId: "bundle-class-8", productId: "seed-extra-6to8-blue-pen", itemType: "stationery", itemName: "Blue Pen", quantity: 1, price: 0, classId: "class-8", subject: "Blue Pen", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-black-pen", courseId: "bundle-class-8", productId: "seed-extra-6to8-black-pen", itemType: "stationery", itemName: "Black Pen", quantity: 1, price: 0, classId: "class-8", subject: "Black Pen", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-geometry", courseId: "bundle-class-8", productId: "seed-extra-6to8-geometry-box", itemType: "stationery", itemName: "Geometry Box", quantity: 1, price: 0, classId: "class-8", subject: "Geometry Box", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-charts", courseId: "bundle-class-8", productId: "seed-extra-6to8-charts", itemType: "stationery", itemName: "Charts", quantity: 2, price: 0, classId: "class-8", subject: "Charts", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-glue", courseId: "bundle-class-8", productId: "seed-extra-6to8-glue", itemType: "stationery", itemName: "Glue", quantity: 1, price: 0, classId: "class-8", subject: "Glue", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-scissors", courseId: "bundle-class-8", productId: "seed-extra-6to8-scissors", itemType: "stationery", itemName: "Scissors", quantity: 1, price: 0, classId: "class-8", subject: "Scissors", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-water-colours", courseId: "bundle-class-8", productId: "seed-extra-6to8-water-colours", itemType: "stationery", itemName: "Water Colours", quantity: 1, price: 0, classId: "class-8", subject: "Water Colours", createdAt: new Date().toISOString() },
  { id: "bundle-item-c8-blue-pencil", courseId: "bundle-class-8", productId: "seed-extra-6to8-blue-pencil", itemType: "stationery", itemName: "Blue Pencil", quantity: 1, price: 0, classId: "class-8", subject: "Blue Pencil", createdAt: new Date().toISOString() },
  ...createAnnualChargeBundleItems(),
];

const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function getBookIdentity(book: Pick<Book, "classId" | "name" | "subject">) {
  return `${book.classId}::${book.name.trim().toLowerCase()}::${book.subject.trim().toLowerCase()}`;
}

function mergeSeedBooks(storedBooks: Book[]) {
  const existingKeys = new Set(storedBooks.map(getBookIdentity));
  const missingSeedBooks = DEFAULT_BOOKS.filter((book) => !existingKeys.has(getBookIdentity(book)));
  return [...storedBooks, ...missingSeedBooks];
}

function getExtraInventoryIdentity(item: Pick<ExtraInventoryItem, "category" | "name" | "note">) {
  return `${item.category}::${item.name.trim().toLowerCase()}::${item.note.trim().toLowerCase()}`;
}

function mergeSeedExtraInventory(storedItems: ExtraInventoryItem[]) {
  const existingKeys = new Set(storedItems.map(getExtraInventoryIdentity));
  const missingItems = DEFAULT_EXTRA_INVENTORY.filter((item) => !existingKeys.has(getExtraInventoryIdentity(item)));
  return [...storedItems, ...missingItems];
}

function getCourseIdentity(course: Pick<CourseBundle, "name" | "schoolName">) {
  return `${course.name.trim().toLowerCase()}::${course.schoolName.trim().toLowerCase()}`;
}

function mergeSeedCourses(storedCourses: CourseBundle[]) {
  const existingKeys = new Set(storedCourses.map(getCourseIdentity));
  const missingCourses = DEFAULT_BUNDLES.filter((course) => !existingKeys.has(getCourseIdentity(course)));
  return [...storedCourses, ...missingCourses];
}

function getCourseItemIdentity(item: Pick<CourseBundleItem, "courseId" | "itemType" | "itemName" | "classId" | "subject">) {
  return `${item.courseId}::${item.itemType}::${item.itemName.trim().toLowerCase()}::${item.classId}::${item.subject.trim().toLowerCase()}`;
}

function mergeSeedCourseItems(storedItems: CourseBundleItem[]) {
  const existingKeys = new Set(storedItems.map(getCourseItemIdentity));
  const missingItems = DEFAULT_BUNDLE_ITEMS.filter((item) => !existingKeys.has(getCourseItemIdentity(item)));
  return [...storedItems, ...missingItems];
}

function readLocal<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function schoolScopedKey(baseKey: string, schoolId: string) {
  return `${baseKey}__${schoolId}`;
}

function migrateLegacySchoolDataIfNeeded(schoolId: string) {
  const mappings = [
    STORAGE_KEYS.classes,
    STORAGE_KEYS.courses,
    STORAGE_KEYS.courseItems,
    STORAGE_KEYS.books,
    STORAGE_KEYS.extraInventory,
    STORAGE_KEYS.invoices,
    STORAGE_KEYS.settings,
    STORAGE_KEYS.sequence,
  ];

  mappings.forEach((baseKey) => {
    const scopedKey = schoolScopedKey(baseKey, schoolId);
    if (localStorage.getItem(scopedKey) !== null) return;
    const legacyValue = localStorage.getItem(baseKey);
    if (legacyValue !== null) {
      localStorage.setItem(scopedKey, legacyValue);
    }
  });
}

function formatInvoiceNumber(seq: number) {
  return `INV-${String(seq).padStart(5, "0")}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildQuarterInvoiceHtml(invoice: Invoice, settings: Settings) {
  const visibleItems = invoice.items;
  const dueDate = invoice.dueDate || invoice.createdAt.slice(0, 10);

  const itemRows = visibleItems
    .map(
      (item) => `
        <tr>
          <td>
            <div class="item-name">${escapeHtml(item.itemName)}</div>
          </td>
          <td class="num">${item.quantity}</td>
          <td class="num">${rupee.format(item.price)}</td>
          <td class="num">${rupee.format(item.lineTotal)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(invoice.invoiceNumber)} - Print</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; background: white; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sheet {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 7mm;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
          }
          .invoice-card {
            width: 95mm;
            min-height: 136.5mm;
            border: 0.25mm solid #111;
            padding: 3.4mm;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            background: #fff;
          }
          .invoice-head {
            display: flex;
            justify-content: space-between;
            gap: 3mm;
            border-bottom: 0.25mm solid #111;
            padding-bottom: 1.5mm;
            margin-bottom: 1.6mm;
          }
          .business-name { font-size: 11.2pt; font-weight: 700; line-height: 1.1; }
          .tagline { font-size: 6.6pt; margin-top: 0.6mm; color: #374151; }
          .invoice-title-wrap { text-align: right; }
          .invoice-title { font-size: 10pt; font-weight: 700; letter-spacing: 0.07em; }
          .business-meta { font-size: 6.5pt; line-height: 1.28; margin-bottom: 1.6mm; }
          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1mm 2.2mm;
            border: 0.25mm solid #111;
            padding: 1.5mm;
            margin-bottom: 1.6mm;
          }
          .label { font-size: 5.8pt; text-transform: uppercase; letter-spacing: 0.04em; color: #4b5563; }
          .value { font-size: 6.8pt; font-weight: 600; margin-top: 0.25mm; }
          .strong { font-size: 7.6pt; }
          .muted { font-size: 6.2pt; color: #374151; margin-top: 0.45mm; }
          .customer-block {
            border: 0.25mm solid #111;
            padding: 1.5mm;
            margin-bottom: 1.5mm;
            min-height: 14mm;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1.5mm;
            table-layout: fixed;
          }
          .items-table th,
          .items-table td {
            border: 0.25mm solid #111;
            padding: 0.8mm 1.1mm;
            font-size: 5.9pt;
            vertical-align: top;
            word-wrap: break-word;
            line-height: 1.18;
          }
          .items-table th { font-weight: 700; text-align: left; }
          .items-table .num {
            text-align: right;
            width: 13.2mm;
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
          }
          .item-name { font-weight: 700; line-height: 1.18; }
          .summary-block {
            border: 0.25mm solid #111;
            padding: 1.5mm;
            margin-top: auto;
          }
          .summary-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 7.4pt;
            padding: 0.7mm 0;
            border-bottom: 0.25mm dashed #cbd5e1;
          }
          .summary-row:last-child { border-bottom: 0; }
          .summary-row.grand { font-size: 8.4pt; font-weight: 700; }
          .footer-block {
            border-top: 0.25mm solid #111;
            margin-top: 2mm;
            padding-top: 2mm;
            font-size: 7.2pt;
            line-height: 1.45;
          }
          .label-inline { font-weight: 700; }
          .thank-you { margin-top: 1mm; font-weight: 600; }
          @media screen {
            body { background: #e5e7eb; padding: 10mm 0; }
            .sheet { background: white; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <section class="invoice-card">
            <div class="invoice-head">
              <div>
                <div class="business-name">${escapeHtml(settings.businessName)}</div>
                ${settings.tagline ? `<div class="tagline">${escapeHtml(settings.tagline)}</div>` : ""}
              </div>
              <div class="invoice-title-wrap">
                <div class="invoice-title">INVOICE</div>
              </div>
            </div>

            <div class="detail-grid">
              <div>
                <div class="label">Invoice No</div>
                <div class="value">${escapeHtml(invoice.invoiceNumber)}</div>
              </div>
              <div>
                <div class="label">Date</div>
                <div class="value">${escapeHtml(formatDateTime(invoice.createdAt))}</div>
              </div>
              <div>
                <div class="label">Due Date</div>
                <div class="value">${escapeHtml(formatDateOnly(dueDate))}</div>
              </div>
              <div>
                <div class="label">Items</div>
                <div class="value">${escapeHtml(String(invoice.items.length))}</div>
              </div>
              <div>
                <div class="label">Total</div>
                <div class="value">${escapeHtml(rupee.format(invoice.total))}</div>
              </div>
            </div>

            <div class="customer-block">
              <div class="label">Customer Details</div>
              <div class="value strong">${escapeHtml(invoice.customerName || "Walk-in Customer")}</div>
              <div class="muted">${escapeHtml(invoice.customerAddress || "Address not provided")}</div>
              <div class="muted">${escapeHtml(invoice.customerPhone || "Phone not provided")}</div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>

            <div class="summary-block">
              <div class="summary-row"><span>Subtotal</span><strong>${rupee.format(invoice.subtotal)}</strong></div>
              <div class="summary-row"><span>Discount</span><strong>${rupee.format(invoice.discount || 0)}</strong></div>
              <div class="summary-row"><span>Tax</span><strong>${rupee.format(invoice.tax || 0)}</strong></div>
              <div class="summary-row grand"><span>Grand Total</span><strong>${rupee.format(invoice.total)}</strong></div>
            </div>

            <div class="footer-block">
              <div class="thank-you">${escapeHtml(settings.thankYouNote || "Thank you")}</div>
            </div>
          </section>
        </div>
      </body>
    </html>
  `;
}

function createSessionToken(user: AdminUser) {
  const payload = {
    sub: user.username,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 10,
  };
  return `local.${btoa(JSON.stringify(payload))}.sig`;
}

function parseSessionToken(token: string | null): { sub: string; role: Role } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1])) as { sub: string; role: Role; exp: number };
    if (Date.now() > payload.exp) return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

function normalizeCourse(raw: Partial<CourseBundle> & { course_name?: string; school_name?: string; created_at?: string }): CourseBundle {
  return {
    id: String(raw.id || crypto.randomUUID()),
    name: String(raw.name || raw.course_name || "").trim(),
    schoolName: String(raw.schoolName || raw.school_name || "").trim(),
    note: String(raw.note || "").trim(),
    createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
  };
}

function normalizeCourseItem(raw: Partial<CourseBundleItem> & { product_id?: string; item_name?: string; item_type?: BundleItemType; created_at?: string }) {
  return {
    id: String(raw.id || crypto.randomUUID()),
    courseId: String(raw.courseId || ""),
    productId: String(raw.productId || raw.product_id || ""),
    itemType: (raw.itemType || raw.item_type || "other") as BundleItemType,
    itemName: String(raw.itemName || raw.item_name || "").trim(),
    quantity: Math.max(1, Number(raw.quantity || 1)),
    price: Math.max(0, Number(raw.price || 0)),
    classId: String(raw.classId || ""),
    subject: String(raw.subject || ""),
    createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
  } satisfies CourseBundleItem;
}

function normalizeInvoice(raw: Partial<Invoice> & { items?: Array<Record<string, unknown>> }): Invoice {
  const items = (raw.items || []).map((item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const price = Math.max(0, Number(item.price || 0));
    const legacyItem = item as Record<string, unknown>;
    return {
      id: String(legacyItem.id || crypto.randomUUID()),
      bookId: String(legacyItem.bookId || legacyItem.productId || ""),
      itemType: String(legacyItem.itemType || "book") as BundleItemType,
      itemName: String(legacyItem.itemName || legacyItem.bookName || "Item"),
      courseName: String(legacyItem.courseName || ""),
      className: String(legacyItem.className || ""),
      subject: String(legacyItem.subject || ""),
      quantity,
      price,
      lineTotal: Math.max(0, Number(legacyItem.lineTotal || quantity * price)),
    } satisfies InvoiceLine;
  });

  const createdAt = String(raw.createdAt || new Date().toISOString());
  const subtotal = Math.max(0, Number(raw.subtotal || items.reduce((sum, item) => sum + item.lineTotal, 0)));
  const discount = Math.max(0, Number(raw.discount || 0));
  const tax = Math.max(0, Number((raw as Partial<Invoice>).tax || 0));
  const total = Math.max(0, Number(raw.total || subtotal - discount + tax));

  return {
    id: String(raw.id || crypto.randomUUID()),
    invoiceNumber: String(raw.invoiceNumber || "INV-00000"),
    createdAt,
    dueDate: String((raw as Partial<Invoice>).dueDate || createdAt.slice(0, 10)),
    customerName: String(raw.customerName || ""),
    customerAddress: String((raw as Partial<Invoice>).customerAddress || ""),
    customerPhone: String((raw as Partial<Invoice>).customerPhone || ""),
    paymentMethod: String((raw as Partial<Invoice>).paymentMethod || "Cash"),
    subtotal,
    discount,
    tax,
    total,
    items,
  };
}

function createEmptyManualInvoiceRow(): InvoiceDraftItem {
  return {
    id: crypto.randomUUID(),
    entryMode: "manual-book",
    itemType: "book",
    bookId: "",
    courseId: "",
    classId: "",
    itemName: "",
    subject: "",
    quantity: 1,
    price: 0,
  };
}

function formatItemTypeLabel(type: BundleItemType) {
  switch (type) {
    case "book":
      return "Book";
    case "notebook":
      return "Notebook";
    case "stationery":
      return "Stationery";
    case "annualCharge":
      return "Annual Charge";
    default:
      return "Other";
  }
}

export function App() {
  const [users, setUsers] = useState<AdminUser[]>(() => readLocal(STORAGE_KEYS.users, [DEFAULT_USER]));
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.token));
  const [schoolWorkspaces, setSchoolWorkspaces] = useState<SchoolWorkspace[]>(() => {
    const stored = readLocal<SchoolWorkspace[]>(STORAGE_KEYS.schoolWorkspaces, []);
    if (!stored.length) return [DEFAULT_SCHOOL];
    return stored.map((school, index) =>
      index === 0 && school.id === "school-default"
        ? { ...school, name: "Brotherhood Academy", note: school.note || "Existing data workspace" }
        : school
    );
  });
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.selectedSchool) || DEFAULT_SCHOOL.id);
  const [classes, setClasses] = useState<ClassItem[]>(DEFAULT_CLASSES);
  const [courses, setCourses] = useState<CourseBundle[]>([]);
  const [courseItems, setCourseItems] = useState<CourseBundleItem[]>([]);
  const [books, setBooks] = useState<Book[]>(mergeSeedBooks([]));
  const [extraInventory, setExtraInventory] = useState<ExtraInventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sequence, setSequence] = useState<number>(1);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [authError, setAuthError] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });
  const [globalError, setGlobalError] = useState("");
  const [schoolForm, setSchoolForm] = useState({ name: "", note: "" });
  const [schoolEditId, setSchoolEditId] = useState<string | null>(null);

  const [classForm, setClassForm] = useState({ name: "", note: "" });
  const [classEditId, setClassEditId] = useState<string | null>(null);

  const [courseForm, setCourseForm] = useState({ name: "", schoolName: "", note: "" });
  const [courseEditId, setCourseEditId] = useState<string | null>(null);

  const [bundleEditorCourseId, setBundleEditorCourseId] = useState<string | null>(null);
  const [bundleItemEditId, setBundleItemEditId] = useState<string | null>(null);
  const [bundleItemForm, setBundleItemForm] = useState({
    itemType: "book" as BundleItemType,
    productId: "",
    itemName: "",
    quantity: "1",
    price: "",
  });

  const [bookForm, setBookForm] = useState({
    name: "",
    classId: "",
    courseId: "",
    subject: "",
    authorPublisher: "",
    price: "",
    stock: "",
  });
  const [bookEditId, setBookEditId] = useState<string | null>(null);
  const [extraItemForm, setExtraItemForm] = useState({
    category: "notebook" as ExtraInventoryCategory,
    name: "",
    price: "",
    stock: "",
    note: "",
  });
  const [extraItemEditId, setExtraItemEditId] = useState<string | null>(null);
  const [extraInventorySearch, setExtraInventorySearch] = useState("");
  const [extraInventoryFilter, setExtraInventoryFilter] = useState<"all" | ExtraInventoryCategory>("all");
  const [classCourseClassId, setClassCourseClassId] = useState<string | null>(null);
  const [classCourseForm, setClassCourseForm] = useState({
    mode: "new" as "new" | "existing",
    name: "",
    note: "",
    existingCourseId: "",
  });
  const [bookSearch, setBookSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [invoiceDraft, setInvoiceDraft] = useState({
    customerName: "",
    customerAddress: "",
    customerPhone: "",
    dueDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "Cash",
    tax: "0",
    discount: "0",
    selectedCourseId: "",
    items: [] as InvoiceDraftItem[],
  });
  const [invoiceError, setInvoiceError] = useState("");

  const [salesMonth, setSalesMonth] = useState(new Date().toISOString().slice(0, 7));

  const session = useMemo(() => parseSessionToken(token), [token]);

  useEffect(() => localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.schoolWorkspaces, JSON.stringify(schoolWorkspaces)), [schoolWorkspaces]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.selectedSchool, selectedSchoolId), [selectedSchoolId]);

  useEffect(() => {
    migrateLegacySchoolDataIfNeeded(selectedSchoolId);
    const storedClasses: ClassItem[] = readLocal(schoolScopedKey(STORAGE_KEYS.classes, selectedSchoolId), []);
    const hydratedClasses = storedClasses.length
      ? (() => {
          const existingIds = new Set(storedClasses.map((c) => c.id));
          const missing = EARLY_CLASSES.filter((c) => !existingIds.has(c.id));
          return missing.length ? [...missing, ...storedClasses] : storedClasses;
        })()
      : DEFAULT_CLASSES;
    setClasses(hydratedClasses);

    const storedCourses = readLocal<Array<Partial<CourseBundle>>>(schoolScopedKey(STORAGE_KEYS.courses, selectedSchoolId), []).map(normalizeCourse);
    const hydratedCourses = selectedSchoolId === DEFAULT_SCHOOL.id ? mergeSeedCourses(storedCourses) : storedCourses;
    setCourses(hydratedCourses);

    const availableCourseIds = new Set(hydratedCourses.map((course) => course.id));

    const storedCourseItems = readLocal<Array<Partial<CourseBundleItem>>>(schoolScopedKey(STORAGE_KEYS.courseItems, selectedSchoolId), []).map(normalizeCourseItem);
    const mergedCourseItems = selectedSchoolId === DEFAULT_SCHOOL.id ? mergeSeedCourseItems(storedCourseItems) : storedCourseItems;
    const normalizedCourseItems = normalizeNotebookBundlePrices(normalizeCourseItemsToClassBundles(mergedCourseItems, hydratedCourses, availableCourseIds));
    setCourseItems(normalizedCourseItems);

    const storedBooks = readLocal<Array<Omit<Book, "courseId"> & { courseId?: string }>>(schoolScopedKey(STORAGE_KEYS.books, selectedSchoolId), []);
    const normalizedBooks = storedBooks.map((book) => ({ ...book, courseId: book.courseId || "" }));
    const mergedBooks = selectedSchoolId === DEFAULT_SCHOOL.id ? mergeSeedBooks(normalizedBooks) : normalizedBooks;
    setBooks(normalizeClassSpecificBookCatalog(normalizeBookPublishers(normalizeBooksToClassBundles(mergedBooks, availableCourseIds))));

    const storedExtraInventory = readLocal<ExtraInventoryItem[]>(schoolScopedKey(STORAGE_KEYS.extraInventory, selectedSchoolId), []);
    const hydratedExtraInventory = selectedSchoolId === DEFAULT_SCHOOL.id ? mergeSeedExtraInventory(storedExtraInventory) : storedExtraInventory;
    setExtraInventory(normalizeNotebookInventoryPrices(hydratedExtraInventory));

    const storedInvoices = readLocal<Array<Partial<Invoice>>>(schoolScopedKey(STORAGE_KEYS.invoices, selectedSchoolId), []).map(normalizeInvoice);
    setInvoices(storedInvoices);

    const storedSettings = readLocal<Partial<Settings>>(schoolScopedKey(STORAGE_KEYS.settings, selectedSchoolId), DEFAULT_SETTINGS);
    const hydratedSettings: Settings = { ...DEFAULT_SETTINGS, ...storedSettings };
    if (selectedSchoolId === DEFAULT_SCHOOL.id && (!hydratedSettings.businessName || hydratedSettings.businessName === "Central Books" || hydratedSettings.businessName === "Default School")) {
      setSettings({ ...hydratedSettings, businessName: "Brotherhood Academy" });
    } else {
      setSettings(hydratedSettings);
    }

    const storedSequence = Number(localStorage.getItem(schoolScopedKey(STORAGE_KEYS.sequence, selectedSchoolId)) || "1");
    setSequence(storedSequence);

    setTab("dashboard");
    setGlobalError("");
    setInvoiceError("");
  }, [selectedSchoolId]);

  useEffect(() => localStorage.setItem(schoolScopedKey(STORAGE_KEYS.classes, selectedSchoolId), JSON.stringify(classes)), [classes, selectedSchoolId]);
  useEffect(() => localStorage.setItem(schoolScopedKey(STORAGE_KEYS.courses, selectedSchoolId), JSON.stringify(courses)), [courses, selectedSchoolId]);
  useEffect(() => localStorage.setItem(schoolScopedKey(STORAGE_KEYS.courseItems, selectedSchoolId), JSON.stringify(courseItems)), [courseItems, selectedSchoolId]);
  useEffect(() => localStorage.setItem(schoolScopedKey(STORAGE_KEYS.books, selectedSchoolId), JSON.stringify(books)), [books, selectedSchoolId]);
  useEffect(() => localStorage.setItem(schoolScopedKey(STORAGE_KEYS.extraInventory, selectedSchoolId), JSON.stringify(extraInventory)), [extraInventory, selectedSchoolId]);
  useEffect(() => localStorage.setItem(schoolScopedKey(STORAGE_KEYS.invoices, selectedSchoolId), JSON.stringify(invoices)), [invoices, selectedSchoolId]);
  useEffect(() => localStorage.setItem(schoolScopedKey(STORAGE_KEYS.settings, selectedSchoolId), JSON.stringify(settings)), [settings, selectedSchoolId]);
  useEffect(() => localStorage.setItem(schoolScopedKey(STORAGE_KEYS.sequence, selectedSchoolId), String(sequence)), [sequence, selectedSchoolId]);

  useEffect(() => {
    if (!classes.length) setClasses(DEFAULT_CLASSES);
  }, [classes]);

  useEffect(() => {
    if (selectedSchoolId !== DEFAULT_SCHOOL.id) return;
    setCourses((prev) => {
      const merged = mergeSeedCourses(prev);
      return JSON.stringify(merged) === JSON.stringify(prev) ? prev : merged;
    });
    setBooks((prev) => {
      const availableCourseIds = new Set(mergeSeedCourses(courses).map((course) => course.id));
      const merged = normalizeClassSpecificBookCatalog(normalizeBookPublishers(normalizeBooksToClassBundles(mergeSeedBooks(prev), availableCourseIds)));
      return JSON.stringify(merged) === JSON.stringify(prev) ? prev : merged;
    });
    setExtraInventory((prev) => {
      const merged = normalizeNotebookInventoryPrices(mergeSeedExtraInventory(prev));
      return JSON.stringify(merged) === JSON.stringify(prev) ? prev : merged;
    });
    setCourseItems((prev) => {
      const mergedCourses = mergeSeedCourses(courses);
      const availableCourseIds = new Set(mergedCourses.map((course) => course.id));
      const merged = normalizeNotebookBundlePrices(normalizeCourseItemsToClassBundles(mergeSeedCourseItems(prev), mergedCourses, availableCourseIds));
      return JSON.stringify(merged) === JSON.stringify(prev) ? prev : merged;
    });
  }, [selectedSchoolId, courses]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", settings.accentColor);
  }, [settings.accentColor]);

  useEffect(() => {
    if (token && !session) {
      localStorage.removeItem(STORAGE_KEYS.token);
      setToken(null);
    }
  }, [token, session]);

  const classNameMap = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const courseNameMap = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesName = b.name.toLowerCase().includes(bookSearch.toLowerCase());
      const matchesClass = classFilter === "all" ? true : b.classId === classFilter;
      const matchesCourse = courseFilter === "all" ? true : b.courseId === courseFilter;
      const matchesSubject = subjectFilter.trim() ? b.subject.toLowerCase().includes(subjectFilter.toLowerCase()) : true;
      return matchesName && matchesClass && matchesCourse && matchesSubject;
    });
  }, [books, bookSearch, classFilter, courseFilter, subjectFilter]);

  const lowStockBooks = useMemo(() => books.filter((b) => b.stock <= settings.lowStockThreshold), [books, settings]);
  const filteredExtraInventory = useMemo(() => {
    return extraInventory.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(extraInventorySearch.toLowerCase()) || item.note.toLowerCase().includes(extraInventorySearch.toLowerCase());
      const matchesCategory = extraInventoryFilter === "all" ? true : item.category === extraInventoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [extraInventory, extraInventorySearch, extraInventoryFilter]);
  const lowStockExtraInventory = useMemo(() => extraInventory.filter((item) => item.stock <= settings.lowStockThreshold), [extraInventory, settings]);
  const totalBooksCount = useMemo(() => books.length, [books]);
  const totalSales = useMemo(() => invoices.reduce((sum, inv) => sum + inv.total, 0), [invoices]);

  const invoicePreviewRows = useMemo(() => {
    return invoiceDraft.items
      .filter((row) => row.itemName.trim() && row.quantity > 0 && row.price >= 0 && (row.entryMode === "bundle-item" || !!row.bookId))
      .map((row) => ({ ...row, lineTotal: row.quantity * row.price }));
  }, [invoiceDraft.items]);

  const subtotal = useMemo(() => invoicePreviewRows.reduce((sum, row) => sum + row.lineTotal, 0), [invoicePreviewRows]);
  const discount = Math.max(0, Number(invoiceDraft.discount || 0));
  const tax = Math.max(0, Number(invoiceDraft.tax || 0));
  const total = Math.max(subtotal - discount + tax, 0);

  const dailySales = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of invoices) {
      const day = inv.createdAt.slice(0, 10);
      map[day] = (map[day] || 0) + inv.total;
    }
    return Object.entries(map)
      .map(([day, amount]) => ({ day, amount }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [invoices]);

  const monthlySales = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of invoices) {
      const month = inv.createdAt.slice(0, 7);
      map[month] = (map[month] || 0) + inv.total;
    }
    return Object.entries(map)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [invoices]);

  const itemSales = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = item.itemName.toLowerCase();
        const current = map[key] || { name: item.itemName, qty: 0, revenue: 0 };
        current.qty += item.quantity;
        current.revenue += item.lineTotal;
        map[key] = current;
      });
    });
    return Object.entries(map)
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [invoices]);

  const monthlyInvoices = useMemo(() => invoices.filter((inv) => inv.createdAt.startsWith(salesMonth)), [invoices, salesMonth]);

  const billingBooksByClass = useMemo(
    () =>
      classes
        .map((item) => ({
          classItem: item,
          books: books.filter((book) => book.classId === item.id && book.stock > 0),
        }))
        .filter((group) => group.books.length > 0),
    [classes, books]
  );

  const selectedBillingCourse = useMemo(
    () => courses.find((course) => course.id === invoiceDraft.selectedCourseId) || null,
    [courses, invoiceDraft.selectedCourseId]
  );

  const extraInventoryByCategory: Record<ExtraInventoryCategory, ExtraInventoryItem[]> = useMemo(
    () => ({
      notebook: extraInventory.filter((item) => item.category === "notebook" && item.stock > 0),
      stationery: extraInventory.filter((item) => item.category === "stationery" && item.stock > 0),
      other: extraInventory.filter((item) => item.category === "other" && item.stock > 0),
      annualCharge: extraInventory.filter((item) => item.category === "annualCharge" && item.stock > 0),
    }),
    [extraInventory]
  );

  const doLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = users.find((u) => u.username === loginForm.username.trim() && u.password === loginForm.password);
    if (!user) {
      setAuthError("Invalid username or password");
      return;
    }
    const next = createSessionToken(user);
    localStorage.setItem(STORAGE_KEYS.token, next);
    setToken(next);
    setAuthError("");
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    setToken(null);
  };

  const submitSchoolWorkspace = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = schoolForm.name.trim();
    if (!name) {
      setGlobalError("School name is required.");
      return;
    }

    if (schoolEditId) {
      setSchoolWorkspaces((prev) => prev.map((school) => (school.id === schoolEditId ? { ...school, name, note: schoolForm.note.trim() } : school)));
      if (schoolEditId === selectedSchoolId) {
        setSettings((prev) => ({ ...prev, businessName: name }));
      }
    } else {
      const nextSchoolId = crypto.randomUUID();
      setSchoolWorkspaces((prev) => [
        ...prev,
        { id: nextSchoolId, name, note: schoolForm.note.trim(), createdAt: new Date().toISOString() },
      ]);
      localStorage.setItem(schoolScopedKey(STORAGE_KEYS.classes, nextSchoolId), JSON.stringify(DEFAULT_CLASSES));
      localStorage.setItem(schoolScopedKey(STORAGE_KEYS.courses, nextSchoolId), JSON.stringify([]));
      localStorage.setItem(schoolScopedKey(STORAGE_KEYS.courseItems, nextSchoolId), JSON.stringify([]));
      localStorage.setItem(schoolScopedKey(STORAGE_KEYS.books, nextSchoolId), JSON.stringify([]));
      localStorage.setItem(schoolScopedKey(STORAGE_KEYS.extraInventory, nextSchoolId), JSON.stringify([]));
      localStorage.setItem(schoolScopedKey(STORAGE_KEYS.invoices, nextSchoolId), JSON.stringify([]));
      localStorage.setItem(schoolScopedKey(STORAGE_KEYS.settings, nextSchoolId), JSON.stringify({ ...DEFAULT_SETTINGS, businessName: name, logoDataUrl: "" }));
      localStorage.setItem(schoolScopedKey(STORAGE_KEYS.sequence, nextSchoolId), "1");
      setSelectedSchoolId(nextSchoolId);
    }

    setSchoolForm({ name: "", note: "" });
    setSchoolEditId(null);
    setGlobalError("");
  };

  const editSchoolWorkspace = (school: SchoolWorkspace) => {
    setSchoolEditId(school.id);
    setSchoolForm({ name: school.name, note: school.note });
    setTab("settings");
  };

  const deleteSchoolWorkspace = (schoolId: string) => {
    if (schoolWorkspaces.length <= 1) {
      setGlobalError("At least one school workspace is required.");
      return;
    }
    setSchoolWorkspaces((prev) => prev.filter((school) => school.id !== schoolId));
    if (selectedSchoolId === schoolId) {
      const nextSchool = schoolWorkspaces.find((school) => school.id !== schoolId);
      if (nextSchool) setSelectedSchoolId(nextSchool.id);
    }
  };

  const submitClass = (e: FormEvent<HTMLFormElement>) => {    e.preventDefault();
    setGlobalError("");
    const name = classForm.name.trim();
    if (!name) return;
    if (classEditId) {
      setClasses((prev) => prev.map((c) => (c.id === classEditId ? { ...c, name, note: classForm.note.trim() } : c)));
    } else {
      setClasses((prev) => [...prev, { id: crypto.randomUUID(), name, note: classForm.note.trim() }]);
    }
    setClassForm({ name: "", note: "" });
    setClassEditId(null);
  };

  const editClass = (item: ClassItem) => {
    setClassForm({ name: item.name, note: item.note });
    setClassEditId(item.id);
  };

  const deleteClass = (id: string) => {
    if (books.some((b) => b.classId === id)) {
      setGlobalError("Cannot delete class with assigned books.");
      return;
    }
    setClasses((prev) => prev.filter((c) => c.id !== id));
  };

  const submitCourse = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError("");
    const name = courseForm.name.trim();
    if (!name) return;
    if (courseEditId) {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseEditId
            ? { ...c, name, schoolName: courseForm.schoolName.trim(), note: courseForm.note.trim() }
            : c
        )
      );
    } else {
      setCourses((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name,
          schoolName: courseForm.schoolName.trim(),
          note: courseForm.note.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setCourseForm({ name: "", schoolName: "", note: "" });
    setCourseEditId(null);
  };

  const editCourse = (item: CourseBundle) => {
    setCourseForm({ name: item.name, schoolName: item.schoolName, note: item.note });
    setCourseEditId(item.id);
  };

  const deleteCourse = (id: string) => {
    if (books.some((b) => b.courseId === id)) {
      setGlobalError("Cannot delete course with assigned books.");
      return;
    }
    if (courseItems.some((item) => item.courseId === id)) {
      setGlobalError("Remove bundle items from this course before deleting it.");
      return;
    }
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const resetBookForm = () => {
    setBookForm({ name: "", classId: "", courseId: "", subject: "", authorPublisher: "", price: "", stock: "" });
    setBookEditId(null);
  };

  const submitBook = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError("");
    const name = bookForm.name.trim();
    const subject = bookForm.subject.trim();
    const mappedPublisher = getMappedPublisher(name);
    const authorPublisher = mappedPublisher || bookForm.authorPublisher.trim();
    const price = Number(bookForm.price);
    const stock = Number(bookForm.stock);
    if (!name || !subject || !authorPublisher || !bookForm.classId) {
      setGlobalError("Book name, class, subject, and author/publisher are required.");
      return;
    }
    if (Number.isNaN(price) || price <= 0 || Number.isNaN(stock) || stock < 0) {
      setGlobalError("Price must be above 0 and stock must be 0 or greater.");
      return;
    }
    const defaultBundleId = getDefaultBundleIdForClassId(bookForm.classId);
    const override = CLASS_BOOK_OVERRIDES[bookForm.classId]?.[normalizeBookTitle(name)];
    const payload: Book = {
      id: bookEditId || crypto.randomUUID(),
      name: override?.rename ?? name,
      classId: bookForm.classId,
      courseId: bookForm.courseId || defaultBundleId,
      subject: override?.subject ?? subject,
      authorPublisher: override?.authorPublisher ?? authorPublisher,
      price: override?.price ?? price,
      stock,
    };
    if (bookEditId) {
      setBooks((prev) => prev.map((b) => (b.id === bookEditId ? payload : b)));
    } else {
      setBooks((prev) => [...prev, payload]);
    }
    resetBookForm();
  };

  const editBook = (book: Book) => {
    setBookEditId(book.id);
    setBookForm({
      name: book.name,
      classId: book.classId,
      courseId: book.courseId || "",
      subject: book.subject,
      authorPublisher: book.authorPublisher,
      price: String(book.price),
      stock: String(book.stock),
    });
  };

  const deleteBook = (id: string) => {
    if (invoices.some((inv) => inv.items.some((item) => item.bookId === id))) {
      setGlobalError("Cannot delete a book that exists in invoice history.");
      return;
    }
    if (courseItems.some((item) => item.productId === id)) {
      setGlobalError("This book is used inside a class bundle. Remove it from the bundle first.");
      return;
    }
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  const resetExtraItemForm = () => {
    setExtraItemForm({ category: "notebook", name: "", price: "", stock: "", note: "" });
    setExtraItemEditId(null);
  };

  const submitExtraItem = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError("");
    const name = extraItemForm.name.trim();
    const price = Number(extraItemForm.price);
    const stock = Number(extraItemForm.stock);
    if (!name) {
      setGlobalError("Item name is required.");
      return;
    }
    if (Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0) {
      setGlobalError("Price and stock must be valid values.");
      return;
    }
    const payload: ExtraInventoryItem = {
      id: extraItemEditId || crypto.randomUUID(),
      category: extraItemForm.category,
      name,
      price,
      stock,
      note: extraItemForm.note.trim(),
    };
    if (extraItemEditId) {
      setExtraInventory((prev) => prev.map((item) => (item.id === extraItemEditId ? payload : item)));
    } else {
      setExtraInventory((prev) => [...prev, payload]);
    }
    resetExtraItemForm();
  };

  const editExtraItem = (item: ExtraInventoryItem) => {
    setExtraItemEditId(item.id);
    setExtraItemForm({
      category: item.category,
      name: item.name,
      price: String(item.price),
      stock: String(item.stock),
      note: item.note,
    });
  };

  const deleteExtraItem = (id: string) => {
    if (invoices.some((inv) => inv.items.some((item) => item.bookId === id))) {
      setGlobalError("Cannot delete an item that exists in invoice history.");
      return;
    }
    if (courseItems.some((item) => item.productId === id)) {
      setGlobalError("This item is used inside a class bundle. Remove it from the bundle first.");
      return;
    }
    setExtraInventory((prev) => prev.filter((item) => item.id !== id));
  };

  const openClassCourseForm = (classId: string) => {
    setGlobalError("");
    setClassCourseClassId(classId);
    setClassCourseForm({
      mode: courses.length ? "existing" : "new",
      name: "",
      note: "",
      existingCourseId: "",
    });
  };

  const cancelClassCourseForm = () => {
    setClassCourseClassId(null);
    setClassCourseForm({
      mode: courses.length ? "existing" : "new",
      name: "",
      note: "",
      existingCourseId: "",
    });
  };

  const submitClassCourseAssignment = (e: FormEvent<HTMLFormElement>, classId: string) => {
    e.preventDefault();
    setGlobalError("");

    const classBooks = books.filter((book) => book.classId === classId);
    if (!classBooks.length) {
      setGlobalError("This class has no books yet. Add books first, then assign or create a course.");
      return;
    }

    const defaultBundleId = getDefaultBundleIdForClassId(classId);
    let targetCourseId = classCourseForm.existingCourseId || defaultBundleId;

    if (classCourseForm.mode === "new") {
      const name = classCourseForm.name.trim();
      if (!name) {
        setGlobalError("Course name is required.");
        return;
      }

      const duplicate = courses.find((course) => course.name.trim().toLowerCase() === name.toLowerCase());
      if (duplicate) {
        targetCourseId = duplicate.id;
      } else {
        const newCourseId = crypto.randomUUID();
        setCourses((prev) => [
          ...prev,
          {
            id: newCourseId,
            name,
            schoolName: "",
            note: classCourseForm.note.trim(),
            createdAt: new Date().toISOString(),
          },
        ]);
        targetCourseId = newCourseId;
      }
    }

    if (!targetCourseId) {
      setGlobalError("Please select an existing course or create a new one.");
      return;
    }

    setBooks((prev) => prev.map((book) => (book.classId === classId ? { ...book, courseId: targetCourseId } : book)));
    cancelClassCourseForm();
  };

  const editBookFromClassSection = (book: Book) => {
    setTab("inventory");
    editBook(book);
  };

  const openBundleItemEditor = (courseId: string, item?: CourseBundleItem) => {
    setGlobalError("");
    setBundleEditorCourseId(courseId);
    if (item) {
      setBundleItemEditId(item.id);
      setBundleItemForm({
        itemType: item.itemType,
        productId: item.productId,
        itemName: item.itemName,
        quantity: String(item.quantity),
        price: String(item.price),
      });
      return;
    }
    setBundleItemEditId(null);
    setBundleItemForm({ itemType: "book", productId: "", itemName: "", quantity: "1", price: "" });
  };

  const cancelBundleItemEditor = () => {
    setBundleEditorCourseId(null);
    setBundleItemEditId(null);
    setBundleItemForm({ itemType: "book", productId: "", itemName: "", quantity: "1", price: "" });
  };

  const submitBundleItem = (e: FormEvent<HTMLFormElement>, courseId: string) => {
    e.preventDefault();
    setGlobalError("");

    const quantity = Math.max(1, Number(bundleItemForm.quantity || 1));
    let price = Math.max(0, Number(bundleItemForm.price || 0));
    let itemName = bundleItemForm.itemName.trim();
    let productId = "";
    let classId = "";
    let subject = "";

    if (bundleItemForm.itemType === "book") {
      const selectedBook = books.find((book) => book.id === bundleItemForm.productId);
      if (!selectedBook) {
        setGlobalError("Please select a book from inventory for the bundle.");
        return;
      }
      productId = selectedBook.id;
      itemName = itemName || selectedBook.name;
      classId = selectedBook.classId;
      subject = selectedBook.subject;
      if (!bundleItemForm.price.trim()) {
        price = selectedBook.price;
      }
    } else {
      const selectedExtraItem = extraInventory.find((item) => item.id === bundleItemForm.productId && item.category === bundleItemForm.itemType);
      if (selectedExtraItem) {
        productId = selectedExtraItem.id;
        itemName = itemName || selectedExtraItem.name;
        if (!bundleItemForm.price.trim()) {
          price = selectedExtraItem.price;
        }
      }
      if (!itemName) {
        setGlobalError("Item name is required for notebook, stationery, or other bundle items.");
        return;
      }
    }

    const payload: CourseBundleItem = {
      id: bundleItemEditId || crypto.randomUUID(),
      courseId,
      productId,
      itemType: bundleItemForm.itemType,
      itemName,
      quantity,
      price,
      classId,
      subject,
      createdAt: new Date().toISOString(),
    };

    if (bundleItemEditId) {
      setCourseItems((prev) => prev.map((item) => (item.id === bundleItemEditId ? payload : item)));
    } else {
      setCourseItems((prev) => [...prev, payload]);
    }

    cancelBundleItemEditor();
  };

  const deleteBundleItem = (id: string) => {
    setCourseItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addManualInvoiceRow = () => {
    setInvoiceDraft((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyManualInvoiceRow()],
    }));
  };

  const updateInvoiceRow = (id: string, updates: Partial<InvoiceDraftItem>) => {
    setInvoiceDraft((prev) => ({
      ...prev,
      items: prev.items.map((row) => (row.id === id ? { ...row, ...updates } : row)),
    }));
  };

  const removeInvoiceRow = (id: string) => {
    setInvoiceDraft((prev) => ({
      ...prev,
      items: prev.items.filter((row) => row.id !== id),
    }));
  };

  const updateManualRowClass = (id: string, classId: string) => {
    updateInvoiceRow(id, {
      classId,
      bookId: "",
      courseId: "",
      itemName: "",
      subject: "",
      quantity: 1,
      price: 0,
    });
  };

  const updateManualRowBook = (id: string, bookId: string) => {
    const selectedBook = books.find((book) => book.id === bookId);
    if (!selectedBook) {
      updateInvoiceRow(id, { bookId: "", itemName: "", subject: "", price: 0, courseId: "" });
      return;
    }
    updateInvoiceRow(id, {
      bookId: selectedBook.id,
      courseId: selectedBook.courseId,
      itemName: selectedBook.name,
      subject: selectedBook.subject,
      price: selectedBook.price,
      classId: selectedBook.classId,
      itemType: "book",
    });
  };

  const loadCourseIntoBilling = (courseId: string) => {
    setInvoiceError("");
    if (!courseId) {
      setInvoiceDraft((prev) => ({
        ...prev,
        selectedCourseId: "",
        items: prev.items.filter((row) => row.entryMode !== "bundle-item"),
      }));
      return;
    }

    const itemsForCourse = getEffectiveCourseItemsForCourse(courseId, courseItems, books);
    if (!itemsForCourse.length) {
      setInvoiceError("Selected course bundle has no items yet.");
      setInvoiceDraft((prev) => ({
        ...prev,
        selectedCourseId: courseId,
        items: prev.items.filter((row) => row.entryMode !== "bundle-item"),
      }));
      return;
    }

    const bundleRows: InvoiceDraftItem[] = itemsForCourse.map((item) => ({
      id: crypto.randomUUID(),
      entryMode: "bundle-item",
      itemType: item.itemType,
      bookId: item.productId,
      courseId: item.courseId,
      classId: item.classId,
      itemName: item.itemName,
      subject: item.subject,
      quantity: item.quantity,
      price: item.price,
    }));

    setInvoiceDraft((prev) => ({
      ...prev,
      selectedCourseId: courseId,
      items: [...prev.items.filter((row) => row.entryMode !== "bundle-item"), ...bundleRows],
    }));
  };

  const createInvoice = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInvoiceError("");
    if (!invoicePreviewRows.length) {
      setInvoiceError("Select a course bundle or add at least one manual book item.");
      return;
    }
    if (discount < 0) {
      setInvoiceError("Discount cannot be negative.");
      return;
    }

    const requiredByProduct = new Map<string, number>();
    invoicePreviewRows.forEach((row) => {
      if (!row.bookId) return;
      requiredByProduct.set(row.bookId, (requiredByProduct.get(row.bookId) || 0) + row.quantity);
    });

    for (const [productId, requiredQty] of requiredByProduct.entries()) {
      const book = books.find((item) => item.id === productId);
      if (book) {
        if (requiredQty > book.stock) {
          setInvoiceError(`Insufficient stock for ${book.name}.`);
          return;
        }
        continue;
      }
      const extraItem = extraInventory.find((item) => item.id === productId);
      if (extraItem && requiredQty > extraItem.stock) {
        setInvoiceError(`Insufficient stock for ${extraItem.name}.`);
        return;
      }
    }

    const items: InvoiceLine[] = invoicePreviewRows.map((row) => ({
      id: crypto.randomUUID(),
      bookId: row.bookId,
      itemType: row.itemType,
      itemName: row.itemName,
      courseName: courseNameMap.get(row.courseId) || "",
      className: classNameMap.get(row.classId) || "",
      subject: row.subject,
      quantity: row.quantity,
      price: row.price,
      lineTotal: row.lineTotal,
    }));

    const createdAt = new Date().toISOString();
    const invoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber: formatInvoiceNumber(sequence),
      createdAt,
      dueDate: invoiceDraft.dueDate || createdAt.slice(0, 10),
      customerName: invoiceDraft.customerName.trim(),
      customerAddress: invoiceDraft.customerAddress.trim(),
      customerPhone: invoiceDraft.customerPhone.trim(),
      paymentMethod: invoiceDraft.paymentMethod || "Cash",
      subtotal,
      discount,
      tax,
      total,
      items,
    };

    setInvoices((prev) => [invoice, ...prev]);
    setBooks((prev) =>
      prev.map((book) => {
        const required = requiredByProduct.get(book.id);
        return required ? { ...book, stock: book.stock - required } : book;
      })
    );
    setExtraInventory((prev) =>
      prev.map((item) => {
        const required = requiredByProduct.get(item.id);
        return required ? { ...item, stock: item.stock - required } : item;
      })
    );
    setSequence((prev) => prev + 1);
    setInvoiceDraft({
      customerName: "",
      customerAddress: "",
      customerPhone: "",
      dueDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "Cash",
      tax: "0",
      discount: "0",
      selectedCourseId: "",
      items: [],
    });
  };

  const printInvoice = (invoice: Invoice) => {
    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) return;
    win.document.write(buildQuarterInvoiceHtml(invoice, settings));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  const downloadInvoicePdf = (invoice: Invoice) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const margin = 8;
    const cardWidth = 95;
    const cardHeight = 136.5;
    const x = margin;
    const y = margin;
    const dueDate = invoice.dueDate || invoice.createdAt.slice(0, 10);

    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.rect(x, y, cardWidth, cardHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.text(settings.businessName, x + 2.5, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.6);
    if (settings.tagline) doc.text(settings.tagline, x + 2.5, y + 8.8, { maxWidth: 55 });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text("INVOICE", x + cardWidth - 2.5, y + 5.5, { align: "right" });
    doc.line(x + 2.5, y + 10.2, x + cardWidth - 2.5, y + 10.2);

    const detailsTop = y + 12.6;
    doc.rect(x + 2.5, detailsTop, cardWidth - 5, 18);
    doc.line(x + 2.5 + (cardWidth - 5) / 2, detailsTop, x + 2.5 + (cardWidth - 5) / 2, detailsTop + 18);
    doc.line(x + 2.5, detailsTop + 6, x + cardWidth - 2.5, detailsTop + 6);
    doc.line(x + 2.5, detailsTop + 12, x + cardWidth - 2.5, detailsTop + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.9);
    doc.text("Invoice No", x + 4, detailsTop + 2.2);
    doc.text("Date", x + cardWidth / 2 + 1.5, detailsTop + 2.2);
    doc.text("Due Date", x + 4, detailsTop + 8.2);
    doc.text("Items", x + cardWidth / 2 + 1.5, detailsTop + 8.2);
    doc.text("Total", x + 4, detailsTop + 14.2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.6);
    doc.text(invoice.invoiceNumber, x + 4, detailsTop + 4.9);
    doc.text(formatDateTime(invoice.createdAt), x + cardWidth / 2 + 1.5, detailsTop + 4.9, { maxWidth: cardWidth / 2 - 4.5 });
    doc.text(formatDateOnly(dueDate), x + 4, detailsTop + 10.9);
    doc.text(String(invoice.items.length), x + cardWidth / 2 + 1.5, detailsTop + 10.9, { maxWidth: cardWidth / 2 - 4.5 });
    doc.text(rupee.format(invoice.total), x + 4, detailsTop + 16.9);

    const customerTop = detailsTop + 20.5;
    doc.rect(x + 2.5, customerTop, cardWidth - 5, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.1);
    doc.text("Customer Details", x + 4, customerTop + 2.6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.text(invoice.customerName || "Walk-in Customer", x + 4, customerTop + 5.5, { maxWidth: cardWidth - 8 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.1);
    doc.text(invoice.customerAddress || "Address not provided", x + 4, customerTop + 8.3, { maxWidth: cardWidth - 8 });
    doc.text(invoice.customerPhone || "Phone not provided", x + 4, customerTop + 11, { maxWidth: cardWidth - 8 });

    const bodyRows = invoice.items.map((item) => [
      {
        content: item.itemName,
        styles: { cellPadding: { top: 0.9, right: 1, bottom: 0.9, left: 1 }, valign: "middle" as const },
      },
      { content: String(item.quantity), styles: { halign: "right" as const, cellPadding: { top: 0.9, right: 1.1, bottom: 0.9, left: 1 } } },
      { content: rupee.format(item.price), styles: { halign: "right" as const, cellPadding: { top: 0.9, right: 1.2, bottom: 0.9, left: 1 } } },
      { content: rupee.format(item.lineTotal), styles: { halign: "right" as const, cellPadding: { top: 0.9, right: 1.2, bottom: 0.9, left: 1 } } },
    ]);

    autoTable(doc, {
      startY: customerTop + 16,
      margin: { left: x + 2.5, right: pageWidth - (x + cardWidth - 2.5) },
      tableWidth: cardWidth - 5,
      styles: {
        fontSize: 5,
        cellPadding: 0.9,
        lineColor: 0,
        lineWidth: 0.15,
        textColor: 20,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: 0,
        lineColor: 0,
        lineWidth: 0.15,
        fontStyle: "bold",
      },
      bodyStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 50.5 },
        1: { cellWidth: 8.5, halign: "right" },
        2: { cellWidth: 13, halign: "right" },
        3: { cellWidth: 15.5, halign: "right" },
      },
      head: [["Item Name", "Qty", "Price", "Total"]],
      body: bodyRows,
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const afterTableY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || customerTop + 40;
    const summaryTop = Math.min(afterTableY + 1.4, y + cardHeight - 24);
    doc.rect(x + 2.5, summaryTop, cardWidth - 5, 11.5);
    const summaryRows = [
      ["Subtotal", rupee.format(invoice.subtotal)],
      ["Discount", rupee.format(invoice.discount || 0)],
      ["Tax", rupee.format(invoice.tax || 0)],
      ["Grand Total", rupee.format(invoice.total)],
    ];
    summaryRows.forEach((row, index) => {
      const rowY = summaryTop + 2.8 + index * 2.5;
      doc.setFont("helvetica", index === summaryRows.length - 1 ? "bold" : "normal");
      doc.setFontSize(index === summaryRows.length - 1 ? 6.2 : 5.5);
      doc.text(row[0], x + 4, rowY);
      doc.text(row[1], x + cardWidth - 4, rowY, { align: "right" });
    });

    const footerTop = y + cardHeight - 6.5;
    doc.line(x + 2.5, footerTop, x + cardWidth - 2.5, footerTop);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.6);
    doc.text(settings.thankYouNote || "Thank you", x + 2.5, footerTop + 4, { maxWidth: cardWidth - 5 });

    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  const exportCsv = () => {
    const headers = [
      "Invoice",
      "DateTime",
      "Customer",
      "Item",
      "Type",
      "Course",
      "Class",
      "Subject",
      "Qty",
      "Price",
      "LineTotal",
      "Subtotal",
      "Discount",
      "Total",
    ];
    const body = invoices.flatMap((inv) =>
      inv.items.map((item) =>
        [
          inv.invoiceNumber,
          inv.createdAt,
          inv.customerName || "Walk-in",
          item.itemName,
          formatItemTypeLabel(item.itemType),
          item.courseName,
          item.className,
          item.subject,
          item.quantity,
          item.price,
          item.lineTotal,
          inv.subtotal,
          inv.discount,
          inv.total,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
    );
    const csv = [headers.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSalesPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${settings.businessName} - Sales History`, 14, 16);
    autoTable(doc, {
      startY: 24,
      head: [["Invoice", "Date", "Customer", "Items", "Total"]],
      body: invoices.map((inv) => [
        inv.invoiceNumber,
        new Date(inv.createdAt).toLocaleString(),
        inv.customerName || "Walk-in",
        String(inv.items.length),
        inv.total.toFixed(2),
      ]),
    });
    doc.save(`sales_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const onLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSettings((prev) => ({ ...prev, logoDataUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center p-4">
        <section className="w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-slate-300/30">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Central Books</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Book Inventory Admin</h1>
          <p className="mt-1 text-sm text-slate-600">Secure login for inventory, class bundles, fast billing, invoicing, and sales records.</p>
          <form onSubmit={doLogin} className="mt-5 space-y-3">
            <input
              value={loginForm.username}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Username"
              required
            />
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Password"
              required
            />
            {authError ? <p className="text-sm text-rose-600">{authError}</p> : null}
            <button className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white">Login</button>
            <p className="text-xs text-slate-500">Default: admin / admin123</p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl p-4 md:p-6">
      <header className="mb-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-md shadow-slate-300/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {settings.logoDataUrl ? <img src={settings.logoDataUrl} alt="Logo" className="h-12 w-12 rounded-lg object-cover" /> : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Central Books</p>
              <h1 className="text-2xl font-bold text-slate-900">{settings.businessName}</h1>
              <p className="text-sm text-slate-500">Workspace: {schoolWorkspaces.find((school) => school.id === selectedSchoolId)?.name || "Unknown School"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              {schoolWorkspaces.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <button onClick={() => setTab("settings")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Manage Schools
            </button>
            <button onClick={logout} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="mb-5 flex flex-wrap gap-2">
        {([
          ["dashboard", "Dashboard"],
          ["inventory", "Inventory"],
          ["classes", "Classes"],
          ["courses", "Courses / Bundles"],
          ["billing", "Billing"],
          ["sales", "Sales"],
          ["settings", "Settings"],
        ] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${tab === value ? "border-transparent bg-[var(--accent)] text-white" : "border-slate-300 bg-white text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {globalError ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{globalError}</p> : null}

      {tab === "dashboard" ? (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card title="Total Books" value={String(totalBooksCount)} />
            <Card title="Low Stock Alerts" value={String(lowStockBooks.length)} />
            <Card title="Total Sales" value={rupee.format(totalSales)} />
            <Card title="Active Bundles" value={String(courses.length)} />
          </div>
          <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
            <h2 className="text-lg font-bold">Low Stock Books</h2>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-2 py-2">Book</th>
                    <th className="px-2 py-2">Course</th>
                    <th className="px-2 py-2">Class</th>
                    <th className="px-2 py-2">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockBooks.map((b) => (
                    <tr key={b.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{b.name}</td>
                      <td className="px-2 py-2">{courseNameMap.get(b.courseId) || "Unassigned"}</td>
                      <td className="px-2 py-2">{classNameMap.get(b.classId) || "Unknown"}</td>
                      <td className="px-2 py-2">{b.stock}</td>
                    </tr>
                  ))}
                  {!lowStockBooks.length ? <tr><td className="px-2 py-3 text-slate-500" colSpan={4}>No low-stock books.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}

      {tab === "inventory" ? (
        <section className="grid gap-5 xl:grid-cols-[1fr,1.7fr]">
          <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
            <h2 className="text-lg font-bold">{bookEditId ? "Edit Book" : "Add New Book"}</h2>
            <form className="mt-3 space-y-3" onSubmit={submitBook}>
              <input
                value={bookForm.name}
                onChange={(e) => setBookForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Book name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                required
              />
              <select
                value={bookForm.courseId}
                onChange={(e) => setBookForm((p) => ({ ...p, courseId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">Choose course bundle (optional)</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
              <select
                value={bookForm.classId}
                onChange={(e) => setBookForm((p) => ({ ...p, classId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                required
              >
                <option value="">Choose class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                value={bookForm.subject}
                onChange={(e) => setBookForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Subject"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                required
              />
              <input
                value={bookForm.authorPublisher}
                onChange={(e) => setBookForm((p) => ({ ...p, authorPublisher: e.target.value }))}
                placeholder="Author / Publisher"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                required
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={bookForm.price}
                  onChange={(e) => setBookForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="Price"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
                <input
                  type="number"
                  min="0"
                  value={bookForm.stock}
                  onChange={(e) => setBookForm((p) => ({ ...p, stock: e.target.value }))}
                  placeholder="Stock"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">{bookEditId ? "Update" : "Add"} Book</button>
                {bookEditId ? <button type="button" onClick={resetBookForm} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button> : null}
              </div>
            </form>
          </article>

          <div className="space-y-5">
            <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <h2 className="text-lg font-bold">Inventory List</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-4">
                <input value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} placeholder="Search by book" className="rounded-xl border border-slate-200 px-3 py-2" />
                <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="all">All bundles</option>
                  {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                </select>
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
                  <option value="all">All classes</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} placeholder="Filter by subject" className="rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-2 py-2">Book</th>
                      <th className="px-2 py-2">Bundle</th>
                      <th className="px-2 py-2">Class</th>
                      <th className="px-2 py-2">Subject</th>
                      <th className="px-2 py-2">Price</th>
                      <th className="px-2 py-2">Stock</th>
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">{b.name}</td>
                        <td className="px-2 py-2">{courseNameMap.get(b.courseId) || "Unassigned"}</td>
                        <td className="px-2 py-2">{classNameMap.get(b.classId) || "Unknown"}</td>
                        <td className="px-2 py-2">{b.subject}</td>
                        <td className="px-2 py-2">{rupee.format(b.price)}</td>
                        <td className="px-2 py-2">{b.stock}</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => editBook(b)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">Edit</button>
                            <button onClick={() => deleteBook(b.id)} className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredBooks.length ? <tr><td colSpan={7} className="px-2 py-3 text-slate-500">No books found.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">Notebook / Stationery / Other / Annual Charge Inventory</h2>
                  <p className="text-sm text-slate-600">Add stock items besides books and use them in bundles and billing.</p>
                </div>
                <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Low Stock: {lowStockExtraInventory.length}</p>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,1.4fr]">
                <form className="space-y-3 rounded-xl border border-slate-200 p-3" onSubmit={submitExtraItem}>
                  <h3 className="font-semibold text-slate-900">{extraItemEditId ? "Edit Item" : "Add Item"}</h3>
                  <select value={extraItemForm.category} onChange={(e) => setExtraItemForm((prev) => ({ ...prev, category: e.target.value as ExtraInventoryCategory }))} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                    <option value="notebook">Notebook</option>
                    <option value="stationery">Stationery</option>
                    <option value="other">Other</option>
                    <option value="annualCharge">Annual Charge</option>
                  </select>
                  <input value={extraItemForm.name} onChange={(e) => setExtraItemForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Item name" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input type="number" min="0" step="0.01" value={extraItemForm.price} onChange={(e) => setExtraItemForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="Price" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
                    <input type="number" min="0" value={extraItemForm.stock} onChange={(e) => setExtraItemForm((prev) => ({ ...prev, stock: e.target.value }))} placeholder="Stock" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
                  </div>
                  <textarea value={extraItemForm.note} onChange={(e) => setExtraItemForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Note (optional)" className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  <div className="flex gap-2">
                    <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">{extraItemEditId ? "Update" : "Add"} Item</button>
                    {extraItemEditId ? <button type="button" onClick={resetExtraItemForm} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button> : null}
                  </div>
                </form>

                <div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input value={extraInventorySearch} onChange={(e) => setExtraInventorySearch(e.target.value)} placeholder="Search by item or note" className="rounded-xl border border-slate-200 px-3 py-2" />
                    <select value={extraInventoryFilter} onChange={(e) => setExtraInventoryFilter(e.target.value as "all" | ExtraInventoryCategory)} className="rounded-xl border border-slate-200 px-3 py-2">
                      <option value="all">All categories</option>
                      <option value="notebook">Notebook</option>
                      <option value="stationery">Stationery</option>
                      <option value="other">Other</option>
                      <option value="annualCharge">Annual Charge</option>
                    </select>
                  </div>
                  <div className="mt-3 overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                          <th className="px-2 py-2">Category</th>
                          <th className="px-2 py-2">Item</th>
                          <th className="px-2 py-2">Price</th>
                          <th className="px-2 py-2">Stock</th>
                          <th className="px-2 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExtraInventory.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="px-2 py-2">{formatItemTypeLabel(item.category)}</td>
                            <td className="px-2 py-2">
                              <p className="font-medium text-slate-900">{item.name}</p>
                              {item.note ? <p className="text-xs text-slate-500">{item.note}</p> : null}
                            </td>
                            <td className="px-2 py-2">{rupee.format(item.price)}</td>
                            <td className="px-2 py-2">{item.stock}</td>
                            <td className="px-2 py-2">
                              <div className="flex gap-2">
                                <button onClick={() => editExtraItem(item)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">Edit</button>
                                <button onClick={() => deleteExtraItem(item.id)} className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!filteredExtraInventory.length ? <tr><td colSpan={5} className="px-2 py-3 text-slate-500">No notebook, stationery, other, or annual charge inventory found.</td></tr> : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {tab === "classes" ? (
        <section className="grid gap-5 xl:grid-cols-[1fr,1.8fr]">
          <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
            <h2 className="text-lg font-bold">{classEditId ? "Edit Class" : "Add Class"}</h2>
            <form className="mt-3 space-y-3" onSubmit={submitClass}>
              <input value={classForm.name} onChange={(e) => setClassForm((p) => ({ ...p, name: e.target.value }))} placeholder="Class name" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
              <textarea value={classForm.note} onChange={(e) => setClassForm((p) => ({ ...p, note: e.target.value }))} placeholder="Note (optional)" className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
              <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">{classEditId ? "Update" : "Add"} Class</button>
            </form>
          </article>

          <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
            <h2 className="text-lg font-bold">Class-wise Books</h2>
            <div className="mt-3 space-y-3">
              {classes.map((c) => {
                const classBooks = books.filter((b) => b.classId === c.id);
                const isAddingCourse = classCourseClassId === c.id;
                return (
                  <div key={c.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900">{c.name}</h3>
                        {c.note ? <p className="text-xs text-slate-500">{c.note}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openClassCourseForm(c.id)} className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white">Add Course</button>
                        <button onClick={() => editClass(c)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">Edit</button>
                        <button onClick={() => deleteClass(c.id)} className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Delete</button>
                      </div>
                    </div>

                    {isAddingCourse ? (
                      <form onSubmit={(e) => submitClassCourseAssignment(e, c.id)} className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-800">Add course for {c.name}</p>
                        <p className="mt-1 text-xs text-slate-500">This assigns the selected or newly created course bundle to all books inside this class.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => setClassCourseForm((prev) => ({ ...prev, mode: "existing" }))} className={`rounded-lg px-3 py-2 text-xs font-semibold ${classCourseForm.mode === "existing" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>Use Existing Course</button>
                          <button type="button" onClick={() => setClassCourseForm((prev) => ({ ...prev, mode: "new" }))} className={`rounded-lg px-3 py-2 text-xs font-semibold ${classCourseForm.mode === "new" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>Create New Course</button>
                        </div>

                        {classCourseForm.mode === "existing" ? (
                          <div className="mt-3">
                            <select value={classCourseForm.existingCourseId} onChange={(e) => setClassCourseForm((prev) => ({ ...prev, existingCourseId: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" required>
                              <option value="">Select existing course</option>
                              {courses.map((course) => (
                                <option key={course.id} value={course.id}>{course.name}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <input value={classCourseForm.name} onChange={(e) => setClassCourseForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Course name" className="rounded-xl border border-slate-200 px-3 py-2" required />
                            <input value={classCourseForm.note} onChange={(e) => setClassCourseForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Course note (optional)" className="rounded-xl border border-slate-200 px-3 py-2" />
                          </div>
                        )}

                        <div className="mt-3 flex gap-2">
                          <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">Save Course</button>
                          <button type="button" onClick={cancelClassCourseForm} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button>
                        </div>
                      </form>
                    ) : null}

                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Manage the books of this class below. Use Add Course when you want to make this class work like a billing course bundle and assign all current class books to that course.
                    </div>

                    <div className="mt-2 overflow-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                            <th className="px-2 py-2">Book</th>
                            <th className="px-2 py-2">Course</th>
                            <th className="px-2 py-2">Subject</th>
                            <th className="px-2 py-2">Price</th>
                            <th className="px-2 py-2">Stock</th>
                            <th className="px-2 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classBooks.map((b) => (
                            <tr key={b.id} className="border-b border-slate-100">
                              <td className="px-2 py-2">{b.name}</td>
                              <td className="px-2 py-2">{courseNameMap.get(b.courseId) || "Unassigned"}</td>
                              <td className="px-2 py-2">{b.subject}</td>
                              <td className="px-2 py-2">{rupee.format(b.price)}</td>
                              <td className="px-2 py-2">{b.stock}</td>
                              <td className="px-2 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <button onClick={() => editBookFromClassSection(b)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">Edit Book</button>
                                  <button onClick={() => deleteBook(b.id)} className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Delete Book</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!classBooks.length ? <tr><td colSpan={6} className="px-2 py-3 text-slate-500">No books assigned.</td></tr> : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      ) : null}

      {tab === "courses" ? (
        <section className="grid gap-5 xl:grid-cols-[1fr,1.8fr]">
          <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
            <h2 className="text-lg font-bold">{courseEditId ? "Edit Course / Bundle" : "Add Course / Bundle"}</h2>
            <form className="mt-3 space-y-3" onSubmit={submitCourse}>
              <input value={courseForm.name} onChange={(e) => setCourseForm((p) => ({ ...p, name: e.target.value }))} placeholder="Course / Class name" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
              <input value={courseForm.schoolName} onChange={(e) => setCourseForm((p) => ({ ...p, schoolName: e.target.value }))} placeholder="School name (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              <textarea value={courseForm.note} onChange={(e) => setCourseForm((p) => ({ ...p, note: e.target.value }))} placeholder="Note (optional)" className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" />
              <div className="flex gap-2">
                <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">{courseEditId ? "Update" : "Add"} Course</button>
                {courseEditId ? <button type="button" onClick={() => { setCourseEditId(null); setCourseForm({ name: "", schoolName: "", note: "" }); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button> : null}
              </div>
            </form>
          </article>

          <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">Courses / Class Bundles</h2>
                <p className="text-sm text-slate-600">Create bundle sets with books, notebooks, stationery, and other course items.</p>
              </div>
              <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Bundle Items: {courseItems.length}</p>
            </div>
            <div className="mt-3 space-y-3">
              {courses.map((course) => {
                const itemsForCourse = getEffectiveCourseItemsForCourse(course.id, courseItems, books);
                const assignedBooks = books.filter((book) => book.courseId === course.id);
                const isEditingItems = bundleEditorCourseId === course.id;
                const selectedBook = books.find((book) => book.id === bundleItemForm.productId);
                const selectedExtraBundleItem = extraInventory.find((item) => item.id === bundleItemForm.productId);
                const selectableExtraItems = bundleItemForm.itemType === "book" ? [] : extraInventoryByCategory[bundleItemForm.itemType];
                return (
                  <div key={course.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{course.name}</h3>
                        <p className="text-xs text-slate-500">School: {course.schoolName || "Not assigned"} • Created: {new Date(course.createdAt).toLocaleDateString()}</p>
                        {course.note ? <p className="mt-1 text-xs text-slate-500">{course.note}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openBundleItemEditor(course.id)} className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white">Add Bundle Item</button>
                        <button onClick={() => editCourse(course)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">Edit</button>
                        <button onClick={() => deleteCourse(course.id)} className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Delete</button>
                      </div>
                    </div>

                    {isEditingItems ? (
                      <form onSubmit={(e) => submitBundleItem(e, course.id)} className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-800">{bundleItemEditId ? "Edit Bundle Item" : `Add Item to ${course.name}`}</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                          <select value={bundleItemForm.itemType} onChange={(e) => {
                            const nextType = e.target.value as BundleItemType;
                            setBundleItemForm((prev) => ({ ...prev, itemType: nextType, productId: "", itemName: "", price: nextType === "book" ? "" : prev.price }));
                          }} className="rounded-xl border border-slate-200 px-3 py-2">
                            <option value="book">Book</option>
                            <option value="notebook">Notebook</option>
                            <option value="stationery">Stationery</option>
                            <option value="other">Other</option>
                            <option value="annualCharge">Annual Charge</option>
                          </select>

                          {bundleItemForm.itemType === "book" ? (
                            <select
                              value={bundleItemForm.productId}
                              onChange={(e) => {
                                const nextBook = books.find((book) => book.id === e.target.value);
                                setBundleItemForm((prev) => ({
                                  ...prev,
                                  productId: e.target.value,
                                  itemName: nextBook?.name || "",
                                  price: nextBook ? String(nextBook.price) : "",
                                }));
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2"
                              required
                            >
                              <option value="">Select inventory book</option>
                              {books.map((book) => (
                                <option key={book.id} value={book.id}>{book.name} • {classNameMap.get(book.classId) || "Unknown"} • {rupee.format(book.price)}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="grid gap-2 md:col-span-2 md:grid-cols-[1.1fr,1fr]">
                              <select
                                value={bundleItemForm.productId}
                                onChange={(e) => {
                                  const nextItem = selectableExtraItems.find((item) => item.id === e.target.value);
                                  setBundleItemForm((prev) => ({
                                    ...prev,
                                    productId: e.target.value,
                                    itemName: nextItem?.name || prev.itemName,
                                    price: nextItem ? String(nextItem.price) : prev.price,
                                  }));
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-2"
                              >
                                <option value="">Select from inventory (optional)</option>
                                {selectableExtraItems.map((item) => (
                                  <option key={item.id} value={item.id}>{item.name} • Stock {item.stock} • {rupee.format(item.price)}</option>
                                ))}
                              </select>
                              <input value={bundleItemForm.itemName} onChange={(e) => setBundleItemForm((prev) => ({ ...prev, itemName: e.target.value }))} placeholder="Item name" className="rounded-xl border border-slate-200 px-3 py-2" required />
                            </div>
                          )}

                          <input type="number" min="1" value={bundleItemForm.quantity} onChange={(e) => setBundleItemForm((prev) => ({ ...prev, quantity: e.target.value }))} placeholder="Quantity" className="rounded-xl border border-slate-200 px-3 py-2" required />
                          <input type="number" min="0" step="0.01" value={bundleItemForm.price} onChange={(e) => setBundleItemForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="Price" className="rounded-xl border border-slate-200 px-3 py-2" required={bundleItemForm.itemType !== "book"} />
                        </div>

                        {bundleItemForm.itemType === "book" && selectedBook ? (
                          <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                            Linked Book: {selectedBook.name} • {classNameMap.get(selectedBook.classId) || "Unknown class"} • {selectedBook.subject} • Stock {selectedBook.stock}
                          </div>
                        ) : null}

                        {bundleItemForm.itemType !== "book" && selectedExtraBundleItem ? (
                          <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                            Linked {formatItemTypeLabel(selectedExtraBundleItem.category)}: {selectedExtraBundleItem.name} • Stock {selectedExtraBundleItem.stock}
                          </div>
                        ) : null}

                        <div className="mt-3 flex gap-2">
                          <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">{bundleItemEditId ? "Update Item" : "Save Item"}</button>
                          <button type="button" onClick={cancelBundleItemEditor} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button>
                        </div>
                      </form>
                    ) : null}

                    <div className="mt-3 overflow-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                            <th className="px-2 py-2">Type</th>
                            <th className="px-2 py-2">Item</th>
                            <th className="px-2 py-2">Class</th>
                            <th className="px-2 py-2">Quantity</th>
                            <th className="px-2 py-2">Price</th>
                            <th className="px-2 py-2">Line Value</th>
                            <th className="px-2 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsForCourse.map((item) => (
                            <tr key={item.id} className="border-b border-slate-100">
                              <td className="px-2 py-2">{formatItemTypeLabel(item.itemType)}</td>
                              <td className="px-2 py-2">
                                <p className="font-medium text-slate-900">{item.itemName}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  {item.subject ? <p className="text-xs text-slate-500">{item.subject}</p> : null}
                                  {"autoLinked" in item && item.autoLinked ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Auto from class book</span> : null}
                                </div>
                              </td>
                              <td className="px-2 py-2">{classNameMap.get(item.classId) || "-"}</td>
                              <td className="px-2 py-2">{item.quantity}</td>
                              <td className="px-2 py-2">{rupee.format(item.price)}</td>
                              <td className="px-2 py-2">{rupee.format(item.quantity * item.price)}</td>
                              <td className="px-2 py-2">
                                {"autoLinked" in item && item.autoLinked ? (
                                  <span className="text-xs text-slate-500">Managed from Inventory</span>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    <button onClick={() => openBundleItemEditor(course.id, item)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">Edit</button>
                                    <button onClick={() => deleteBundleItem(item.id)} className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Delete</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                          {!itemsForCourse.length ? <tr><td colSpan={7} className="px-2 py-3 text-slate-500">No bundle items added yet.</td></tr> : null}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <h4 className="text-sm font-semibold text-slate-900">Assigned Inventory Books</h4>
                      <p className="mt-1 text-xs text-slate-500">Books linked to this course from inventory/class management.</p>
                      <div className="mt-2 overflow-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                              <th className="px-2 py-2">Book</th>
                              <th className="px-2 py-2">Class</th>
                              <th className="px-2 py-2">Subject</th>
                              <th className="px-2 py-2">Price</th>
                              <th className="px-2 py-2">Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignedBooks.map((book) => (
                              <tr key={book.id} className="border-b border-slate-100">
                                <td className="px-2 py-2">{book.name}</td>
                                <td className="px-2 py-2">{classNameMap.get(book.classId) || "Unknown"}</td>
                                <td className="px-2 py-2">{book.subject}</td>
                                <td className="px-2 py-2">{rupee.format(book.price)}</td>
                                <td className="px-2 py-2">{book.stock}</td>
                              </tr>
                            ))}
                            {!assignedBooks.length ? <tr><td colSpan={5} className="px-2 py-3 text-slate-500">No inventory books assigned to this course yet.</td></tr> : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!courses.length ? <p className="text-sm text-slate-500">No courses created yet.</p> : null}
            </div>
          </article>
        </section>
      ) : null}

      {tab === "billing" ? (
        <section className="grid gap-5 xl:grid-cols-[1.2fr,1.7fr]">
          <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">Create Invoice</h2>
                <p className="text-sm text-slate-600">Workflow: Select Course → Items auto-added → Generate Invoice.</p>
              </div>
              <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Next: {formatInvoiceNumber(sequence)}</p>
            </div>
            <form className="mt-3 space-y-3" onSubmit={createInvoice}>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={invoiceDraft.customerName} onChange={(e) => setInvoiceDraft((p) => ({ ...p, customerName: e.target.value }))} placeholder="Customer name" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                <input value={invoiceDraft.customerPhone} onChange={(e) => setInvoiceDraft((p) => ({ ...p, customerPhone: e.target.value }))} placeholder="Customer phone" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <textarea value={invoiceDraft.customerAddress} onChange={(e) => setInvoiceDraft((p) => ({ ...p, customerAddress: e.target.value }))} placeholder="Customer address" className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2" />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Invoice Date
                  <input value={new Date().toISOString().slice(0, 10)} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Payment Due Date
                  <input type="date" value={invoiceDraft.dueDate} onChange={(e) => setInvoiceDraft((p) => ({ ...p, dueDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select value={invoiceDraft.paymentMethod} onChange={(e) => setInvoiceDraft((p) => ({ ...p, paymentMethod: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank</option>
                </select>
                <select value={invoiceDraft.selectedCourseId} onChange={(e) => loadCourseIntoBilling(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                  <option value="">Select Course / Class Bundle</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.name}{course.schoolName ? ` • ${course.schoolName}` : ""}</option>
                  ))}
                </select>
              </div>

              {selectedBillingCourse ? (
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Loaded bundle: <strong>{selectedBillingCourse.name}</strong>{selectedBillingCourse.schoolName ? ` • ${selectedBillingCourse.schoolName}` : ""}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={addManualInvoiceRow} className="rounded-xl border border-dashed border-slate-400 px-3 py-2 text-sm font-semibold">+ Add Manual Book</button>
                {invoiceDraft.selectedCourseId ? <button type="button" onClick={() => loadCourseIntoBilling("")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Clear Bundle Items</button> : null}
              </div>

              <div className="space-y-3">
                {invoiceDraft.items.map((row, index) => {
                  const booksForRow = books.filter((book) => book.classId === row.classId && book.stock > 0);
                  return (
                    <div key={row.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{row.entryMode === "bundle-item" ? `Bundle Item ${index + 1}` : `Manual Book ${index + 1}`}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{formatItemTypeLabel(row.itemType)}</span>
                      </div>

                      {row.entryMode === "manual-book" ? (
                        <div className="grid gap-2 lg:grid-cols-[160px,1fr,100px,120px,auto]">
                          <select value={row.classId} onChange={(e) => updateManualRowClass(row.id, e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" required>
                            <option value="">Select class</option>
                            {classes.map((classItem) => (
                              <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
                            ))}
                          </select>
                          <select value={row.bookId} onChange={(e) => updateManualRowBook(row.id, e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" required disabled={!row.classId}>
                            <option value="">Select book</option>
                            {booksForRow.map((book) => (
                              <option key={book.id} value={book.id}>{book.name} ({book.stock})</option>
                            ))}
                          </select>
                          <input type="number" min="1" value={row.quantity} onChange={(e) => updateInvoiceRow(row.id, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="rounded-xl border border-slate-200 px-3 py-2" required />
                          <input type="number" min="0" step="0.01" value={row.price} onChange={(e) => updateInvoiceRow(row.id, { price: Math.max(0, Number(e.target.value) || 0) })} className="rounded-xl border border-slate-200 px-3 py-2" required />
                          <button type="button" onClick={() => removeInvoiceRow(row.id)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold">Remove</button>
                        </div>
                      ) : (
                        <div className="grid gap-2 lg:grid-cols-[1.2fr,140px,140px,auto]">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="font-semibold text-slate-900">{row.itemName}</p>
                            <p className="text-xs text-slate-500">{courseNameMap.get(row.courseId) || "Bundle"} • {classNameMap.get(row.classId) || "No class"}{row.subject ? ` • ${row.subject}` : ""}</p>
                          </div>
                          <input type="number" min="1" value={row.quantity} onChange={(e) => updateInvoiceRow(row.id, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="rounded-xl border border-slate-200 px-3 py-2" required />
                          <input type="number" min="0" step="0.01" value={row.price} onChange={(e) => updateInvoiceRow(row.id, { price: Math.max(0, Number(e.target.value) || 0) })} className="rounded-xl border border-slate-200 px-3 py-2" required />
                          <button type="button" onClick={() => removeInvoiceRow(row.id)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold">Remove</button>
                        </div>
                      )}

                      {row.entryMode === "manual-book" && row.classId && !booksForRow.length ? <p className="mt-2 text-xs text-amber-700">No available books in this class.</p> : null}
                    </div>
                  );
                })}
                {!invoiceDraft.items.length ? <p className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">No invoice items yet. Select a course bundle or add a manual book row.</p> : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input type="number" min="0" step="0.01" value={invoiceDraft.discount} onChange={(e) => setInvoiceDraft((p) => ({ ...p, discount: e.target.value }))} placeholder="Discount on full invoice / bundle" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                <input type="number" min="0" step="0.01" value={invoiceDraft.tax} onChange={(e) => setInvoiceDraft((p) => ({ ...p, tax: e.target.value }))} placeholder="Tax (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p>Subtotal: {rupee.format(subtotal)}</p>
                <p>Discount: {rupee.format(discount || 0)}</p>
                <p>Tax: {rupee.format(tax || 0)}</p>
                <p className="font-bold">Grand Total: {rupee.format(total)}</p>
              </div>
              {invoiceError ? <p className="text-sm text-rose-600">{invoiceError}</p> : null}
              <button className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white">Generate {formatInvoiceNumber(sequence)}</button>
            </form>
          </article>

          <div className="space-y-5">
            <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <h2 className="text-lg font-bold">Books by Class for Manual Billing</h2>
              <p className="mt-1 text-sm text-slate-600">Use this for quick class-based manual selection when you do not want the full bundle.</p>
              <div className="mt-3 space-y-3">
                {billingBooksByClass.map((group) => (
                  <div key={group.classItem.id} className="rounded-xl border border-slate-200 p-3">
                    <h3 className="font-semibold text-slate-900">{group.classItem.name}</h3>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {group.books.map((book) => (
                        <div key={book.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <p className="font-semibold text-slate-900">{book.name}</p>
                          <p className="text-slate-600">{courseNameMap.get(book.courseId) || "Unassigned"} • {book.subject}</p>
                          <p className="text-slate-600">Stock: {book.stock}</p>
                          <p className="font-bold">{rupee.format(book.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!billingBooksByClass.length ? <p className="text-sm text-slate-500">No books available for billing.</p> : null}
              </div>
            </article>

            <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">Invoice History</h2>
                <button onClick={exportCsv} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Export CSV</button>
              </div>
              <div className="mt-3 space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{inv.invoiceNumber}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(inv.createdAt)}</p>
                        <p className="text-sm text-slate-600">Customer: {inv.customerName || "Walk-in"}</p>
                        <p className="text-xs text-slate-500">Due: {formatDateOnly(inv.dueDate || inv.createdAt)} • Payment: {inv.paymentMethod || "Cash"}</p>
                        <p className="text-xs text-slate-500">Items: {inv.items.length}</p>
                      </div>
                      <p className="text-lg font-bold">{rupee.format(inv.total)}</p>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => printInvoice(inv)} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold">Print</button>
                      <button onClick={() => downloadInvoicePdf(inv)} className="rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">PDF</button>
                    </div>
                  </div>
                ))}
                {!invoices.length ? <p className="text-sm text-slate-500">No invoices created yet.</p> : null}
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {tab === "sales" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Export Sales CSV</button>
            <button onClick={exportSalesPdf} className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">Export Sales PDF</button>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <DataPanel title="Daily Sales" empty="No daily sales yet" items={dailySales.map((d) => [d.day, rupee.format(d.amount)])} />
            <DataPanel title="Monthly Sales" empty="No monthly sales yet" items={monthlySales.map((m) => [m.month, rupee.format(m.amount)])} />
            <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <h3 className="text-lg font-bold">Item-wise Sales</h3>
              <div className="mt-3 space-y-2 text-sm">
                {itemSales.slice(0, 12).map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-slate-600">Qty: {item.qty}</p>
                    <p className="font-bold">{rupee.format(item.revenue)}</p>
                  </div>
                ))}
                {!itemSales.length ? <p className="text-slate-500">No sales records.</p> : null}
              </div>
            </article>
          </div>

          <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">Monthly Invoice Breakdown</h3>
              <input type="month" value={salesMonth} onChange={(e) => setSalesMonth(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" />
            </div>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><th className="px-2 py-2">Invoice</th><th className="px-2 py-2">Customer</th><th className="px-2 py-2">Date</th><th className="px-2 py-2">Total</th></tr></thead>
                <tbody>
                  {monthlyInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100"><td className="px-2 py-2">{inv.invoiceNumber}</td><td className="px-2 py-2">{inv.customerName || "Walk-in"}</td><td className="px-2 py-2">{new Date(inv.createdAt).toLocaleDateString()}</td><td className="px-2 py-2">{rupee.format(inv.total)}</td></tr>
                  ))}
                  {!monthlyInvoices.length ? <tr><td colSpan={4} className="px-2 py-3 text-slate-500">No invoices for selected month.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}

      {tab === "settings" ? (
        <section className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.1fr,1fr]">
            <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <h2 className="text-lg font-bold">Brand & Theme Customization</h2>
              <div className="mt-3 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Business Name
                  <input value={settings.businessName} onChange={(e) => setSettings((p) => ({ ...p, businessName: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Tagline
                  <input value={settings.tagline} onChange={(e) => setSettings((p) => ({ ...p, tagline: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Accent Color
                    <input type="color" value={settings.accentColor} onChange={(e) => setSettings((p) => ({ ...p, accentColor: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-2" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Thank You Note
                  <input value={settings.thankYouNote} onChange={(e) => setSettings((p) => ({ ...p, thankYouNote: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Low-stock threshold
                  <input type="number" min="1" value={settings.lowStockThreshold} onChange={(e) => setSettings((p) => ({ ...p, lowStockThreshold: Math.max(1, Number(e.target.value) || 1) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Upload Logo
                  <input type="file" accept="image/*" onChange={onLogoUpload} className="mt-1 w-full text-sm" />
                </label>
                {settings.logoDataUrl ? <button onClick={() => setSettings((p) => ({ ...p, logoDataUrl: "" }))} className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700">Remove Logo</button> : null}
              </div>
            </article>

            <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <h2 className="text-lg font-bold">Admin Security</h2>
              <p className="mt-1 text-sm text-slate-600">Change your password for long-term daily usage.</p>
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const current = String(form.get("current") || "");
                  const next = String(form.get("next") || "");
                  if (next.trim().length < 6) {
                    alert("New password must be at least 6 characters.");
                    return;
                  }
                  const idx = users.findIndex((u) => u.username === session.sub);
                  if (idx < 0 || users[idx].password !== current) {
                    alert("Current password is incorrect.");
                    return;
                  }
                  const clone = [...users];
                  clone[idx] = { ...clone[idx], password: next.trim() };
                  setUsers(clone);
                  e.currentTarget.reset();
                  alert("Password changed successfully.");
                }}
              >
                <input type="password" name="current" placeholder="Current password" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
                <input type="password" name="next" placeholder="New password" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
                <button className="w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">Update Password</button>
              </form>
            </article>
          </div>

          <section className="grid gap-5 lg:grid-cols-[1fr,1.5fr]">
            <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <h2 className="text-lg font-bold">School Workspaces</h2>
              <p className="mt-1 text-sm text-slate-600">Create separate schools so books, bundles, billing, and sales do not mash up together.</p>
              <form className="mt-3 space-y-3" onSubmit={submitSchoolWorkspace}>
                <input
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="School name"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
                <textarea
                  value={schoolForm.note}
                  onChange={(e) => setSchoolForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Note (optional)"
                  className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
                <div className="flex gap-2">
                  <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">{schoolEditId ? "Update" : "Add"} School</button>
                  {schoolEditId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSchoolEditId(null);
                        setSchoolForm({ name: "", note: "" });
                      }}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </article>

            <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">Available Schools</h2>
                  <p className="text-sm text-slate-600">Switch between schools from the header dropdown.</p>
                </div>
                <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Current: {schoolWorkspaces.find((school) => school.id === selectedSchoolId)?.name || "Unknown"}</span>
              </div>
              <div className="mt-3 space-y-3">
                {schoolWorkspaces.map((school) => (
                  <div key={school.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{school.name}</p>
                        <p className="text-xs text-slate-500">Created: {new Date(school.createdAt).toLocaleDateString()}</p>
                        {school.note ? <p className="mt-1 text-sm text-slate-600">{school.note}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedSchoolId(school.id)} className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold">Open</button>
                        <button onClick={() => editSchoolWorkspace(school)} className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold">Edit</button>
                        <button onClick={() => deleteSchoolWorkspace(school.id)} className="rounded-md bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </section>
      ) : null}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm shadow-slate-300/20">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  );
}

function DataPanel({ title, items, empty }: { title: string; items: [string, string][]; empty: string }) {
  return (
    <article className="rounded-2xl border border-white/70 bg-white/90 p-4">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-3 space-y-2 text-sm">
        {items.slice(0, 12).map((item) => (
          <div key={`${item[0]}-${item[1]}`} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span>{item[0]}</span>
            <strong>{item[1]}</strong>
          </div>
        ))}
        {!items.length ? <p className="text-slate-500">{empty}</p> : null}
      </div>
    </article>
  );
}
