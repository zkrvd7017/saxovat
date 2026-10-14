export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "tortlar" | "ichimliklar" | "shirinliklar";
  image: string;
};

export const CATEGORIES = [
  { id: "all", label: "Barchasi" },
  { id: "tortlar", label: "Tortlar" },
  { id: "shirinliklar", label: "Shirinliklar" },
  { id: "ichimliklar", label: "Ichimliklar" },
] as const;

const img = (q: string) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=800&q=80`;

export const MENU: MenuItem[] = [
  { id: "1", name: "Saxovat Signature", description: "Belgiyalik shokolad va malina kremi bilan", price: 285000, category: "tortlar", image: img("photo-1565958011703-44f9829ba187") },
  { id: "2", name: "Silk Road Honey Cake", description: "Asal qatlamlari va smetana kremi", price: 240000, category: "tortlar", image: img("photo-1571115177098-24ec42ed204d") },
  { id: "3", name: "Emerald Pistachio", description: "Eron pistasi va atirgul suvi", price: 320000, category: "tortlar", image: img("photo-1578985545062-69928b1d9587") },
  { id: "4", name: "Macaron Assorti", description: "12 dona, Fransuz uslubida", price: 145000, category: "shirinliklar", image: img("photo-1569864358642-9d1684040f43") },
  { id: "5", name: "Eclair Vanilla", description: "Madagaskar vanil kremi", price: 38000, category: "shirinliklar", image: img("photo-1488477181946-6428a0291777") },
  { id: "6", name: "Tiramisu Classic", description: "Mascarpone va espresso", price: 65000, category: "shirinliklar", image: img("photo-1571877227200-a0d98ea607e9") },
  { id: "7", name: "Caramel Latte", description: "Yumshoq karamel va sut", price: 42000, category: "ichimliklar", image: img("photo-1561882468-9110e03e0f78") },
  { id: "8", name: "Saxovat Hot Chocolate", description: "Qoramtir shokolad, marshmallow", price: 38000, category: "ichimliklar", image: img("photo-1517578239113-b03992dcdd25") },
  { id: "9", name: "Silk Road Matcha", description: "Yapon matcha va asal", price: 45000, category: "ichimliklar", image: img("photo-1536013455834-d2db94613fac") },
];

export const STORIES = [
  { id: "s1", label: "Yangi", image: img("photo-1565958011703-44f9829ba187") },
  { id: "s2", label: "Chegirma", image: img("photo-1488477181946-6428a0291777") },
  { id: "s3", label: "Promo", image: img("photo-1571115177098-24ec42ed204d") },
  { id: "s4", label: "Tort", image: img("photo-1578985545062-69928b1d9587") },
  { id: "s5", label: "Kofe", image: img("photo-1561882468-9110e03e0f78") },
  { id: "s6", label: "Set", image: img("photo-1569864358642-9d1684040f43") },
];

export const OFFERS = [
  {
    id: "o1",
    title: "Saxovat Delivery",
    subtitle: "Sevimli taomlaringizni nafis qadoqda manzilingizgacha yetkazamiz",
    bgColor: "bg-[#174d3d]",
    textColor: "text-white",
    image: "/delivery.webp"
  },
  {
    id: "o2",
    title: "Ta’m va an’ana",
    subtitle: "Sevimli taomingizni menyudan tanlang",
    bgColor: "bg-[#dde2d3]",
    textColor: "text-[#193f34]",
    image: "/food/kebab.jpg"
  },
];

export type MockUser = {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
  balance: number;
};

export const MOCK_USERS: MockUser[] = [
  { id: "u1", name: "Aziza Karimova", phone: "+998 90 111 24 20", cardNumber: "111 0000 0000 2420", balance: 15000 },
  { id: "u2", name: "Bobur Rashidov", phone: "+998 90 222 33 44", cardNumber: "222 0000 0000 3344", balance: 42500 },
  { id: "u3", name: "Dilnoza Yusupova", phone: "+998 93 555 77 88", cardNumber: "333 0000 0000 7788", balance: 8200 },
];

export type Txn = {
  id: string;
  user: string;
  type: "credit" | "debit";
  amount: number;
  bill: number;
  at: string;
};

export const MOCK_TXNS: Txn[] = [
  { id: "t1", user: "Aziza Karimova", type: "credit", amount: 2850, bill: 285000, at: "Bugun, 14:32" },
  { id: "t2", user: "Bobur Rashidov", type: "debit", amount: 15000, bill: 145000, at: "Bugun, 13:11" },
  { id: "t3", user: "Dilnoza Yusupova", type: "credit", amount: 420, bill: 42000, at: "Bugun, 11:48" },
  { id: "t4", user: "Aziza Karimova", type: "credit", amount: 650, bill: 65000, at: "Kecha, 19:22" },
  { id: "t5", user: "Bobur Rashidov", type: "credit", amount: 3200, bill: 320000, at: "Kecha, 17:05" },
];

export const fmt = (n: number) =>
  n.toLocaleString("ru-RU").replace(/,/g, " ") + " so'm";
