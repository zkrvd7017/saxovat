// Saxovat restaurant management: menu, stories, staff and table QR.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, LayoutDashboard, Settings, Plus, Loader2, LogOut, UserPlus, X, Trash2, UtensilsCrossed, Image, Layers } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { CandyLogo } from "@/components/CandyLogo";
import { ImageUploader } from "@/components/ImageUploader";
import { useAuth } from "@/lib/auth-context";
import {
  createEmployee,
  adminGetMenuItems,
  adminCreateMenuItem,
  adminDeleteMenuItem,
  adminUpdatePrepTime,
  adminGetCategories,
  adminCreateCategory,
  adminDeleteCategory,
  adminGetBanner,
  adminSetBanner,
  adminGetStories,
  adminCreateStory,
  adminDeleteStory,
  type MenuItemAPI,
  type MenuCategoryAPI,
  type StoryAPI,
} from "@/lib/api";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Saxovat — Admin" },
      { name: "description", content: "Restoran menyusi va kontent boshqaruvi." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

/** Format number as UZS */
const fmt = (n: number) =>
  n.toLocaleString("ru-RU").replace(/,/g, " ") + " so'm";

function Admin() {
  const { isAuthenticated, role, user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  // Determine available sections based on role
  const isSuperAdmin = role === "SUPER_ADMIN";
  type Section = "overview" | "settings" | "menu" | "stories";
  const [section, setSection] = useState<Section>("overview");
  const [menuQrOpen, setMenuQrOpen] = useState(false);

  // Menu management state
  const [menuItems, setMenuItems] = useState<MenuItemAPI[]>([]);
  const [categories, setCategories] = useState<MenuCategoryAPI[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerInput, setBannerInput] = useState("");
  // New item form
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemPrepTime, setNewItemPrepTime] = useState("15");
  const [prepTimeEdits, setPrepTimeEdits] = useState<Record<number, string>>({});
  const [prepTimeSaving, setPrepTimeSaving] = useState<number | null>(null);
  const [newItemImage, setNewItemImage] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [itemSaving, setItemSaving] = useState(false);
  // New category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatImage, setNewCatImage] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  // Stories management state
  const [adminStories, setAdminStories] = useState<StoryAPI[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryImage, setNewStoryImage] = useState("");
  const [storySaving, setStorySaving] = useState(false);

  // Settings — Add Employee state
  const [empPhone, setEmpPhone] = useState("+998 ");
  const [empPassword, setEmpPassword] = useState("");
  const [empFirstName, setEmpFirstName] = useState("");
  const [empLastName, setEmpLastName] = useState("");
  const [empLoading, setEmpLoading] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: "/staff-login" });
    }
    if (!authLoading && isAuthenticated && role === "CUSTOMER") {
      navigate({ to: "/" });
    }
  }, [authLoading, isAuthenticated, role, navigate]);

  // Fetch restaurant content for the selected management section.
  useEffect(() => {
    if (authLoading || !isAuthenticated || !isSuperAdmin) return;
    if (section === "overview" || section === "menu") loadMenuData();
    if (section === "overview" || section === "stories") loadStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, isSuperAdmin, section]);

  const loadStories = async () => {
    setStoriesLoading(true);
    try {
      const data = await adminGetStories();
      setAdminStories(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Istoriyalar yuklanmadi";
      toast.error(message);
    } finally {
      setStoriesLoading(false);
    }
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryTitle || !newStoryImage) {
      toast.error("Mavzu va rasm kiritilishi shart!");
      return;
    }
    setStorySaving(true);
    try {
      await adminCreateStory({ title: newStoryTitle, image_url: newStoryImage });
      toast.success("Istoriya saqlandi");
      setNewStoryTitle("");
      setNewStoryImage("");
      loadStories();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast.error(message);
    } finally {
      setStorySaving(false);
    }
  };

  const handleDeleteStory = async (id: number) => {
    if (!confirm("Haqiqatan ham bu istoriyani o'chirmoqchimisiz?")) return;
    try {
      await adminDeleteStory(id);
      toast.success("Istoriya o'chirildi");
      loadStories();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast.error(message);
    }
  };


  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empPhone.trim() || empPhone === "+998 " || !empPassword.trim() || !empFirstName.trim()) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }
    setEmpLoading(true);
    try {
      const result = await createEmployee({
        phone_number: empPhone.replace(/\s+/g, ""),
        password: empPassword.trim(),
        first_name: empFirstName.trim(),
        last_name: empLastName.trim(),
      });
      toast.success(result.detail);
      setEmpPhone("+998 ");
      setEmpPassword("");
      setEmpFirstName("");
      setEmpLastName("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast.error(message);
    } finally {
      setEmpLoading(false);
    }
  };

  // Loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || role === "CUSTOMER") return null;

  const sidebarItems: { id: Section; icon: typeof QrCode; label: string }[] = [
    { id: "overview", icon: LayoutDashboard, label: "Bosh sahifa" },
    ...(isSuperAdmin ? [
      { id: "menu" as Section, icon: UtensilsCrossed, label: "Menyu" },
      { id: "stories" as Section, icon: Image, label: "Istoriyalar" },
      { id: "settings" as Section, icon: Settings, label: "Sozlamalar" },
    ] : []),
  ];

  const loadMenuData = async () => {
    setMenuLoading(true);
    try {
      const [items, cats, bannerData] = await Promise.all([
        adminGetMenuItems(),
        adminGetCategories(),
        adminGetBanner(),
      ]);
      setMenuItems(items);
      setCategories(cats);
      setBannerUrl(bannerData.image_url || "");
    } catch (err: unknown) {
      toast.error("Menyu ma'lumotlarini yuklashda xatolik");
    } finally {
      setMenuLoading(false);
    }
  };

  const handleCreateItem = async () => {
    if (!newItemTitle || !newItemCategory || !newItemPrice) {
      toast.error("Iltimos barcha majburiy maydonlarni to'ldiring");
      return;
    }
    if (!/^\d+$/.test(newItemPrepTime) || Number(newItemPrepTime) > 2147483647) {
      toast.error("Tayyorlanish vaqtini 0 yoki undan katta butun daqiqada kiriting");
      return;
    }
    setItemSaving(true);
    try {
      const item = await adminCreateMenuItem({
        title: newItemTitle,
        category: newItemCategory,
        price: Number(newItemPrice),
        prep_time: Number(newItemPrepTime),
        image_url: newItemImage || "",
        description: newItemDesc || "",
      });
      setMenuItems(prev => [...prev, item]);
      setNewItemTitle(""); setNewItemCategory(""); setNewItemPrice(""); setNewItemImage(""); setNewItemDesc("");
      setNewItemPrepTime("15");
      toast.success(`"${item.title}" menyuga qo'shildi!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setItemSaving(false);
    }
  };

  const handleSavePrepTime = async (item: MenuItemAPI) => {
    if (prepTimeSaving !== null) return;
    const value = prepTimeEdits[item.id] ?? String(item.prep_time);
    if (!/^\d+$/.test(value) || Number(value) > 2147483647) {
      toast.error("Tayyorlanish vaqtini 0 yoki undan katta butun daqiqada kiriting");
      return;
    }
    setPrepTimeSaving(item.id);
    try {
      const updated = await adminUpdatePrepTime(item.id, Number(value));
      setMenuItems(items => items.map(current => current.id === item.id ? updated : current));
      setPrepTimeEdits(edits => {
        const next = { ...edits };
        delete next[item.id];
        return next;
      });
      toast.success("Tayyorlanish vaqti saqlandi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vaqtni saqlashda xatolik");
    } finally {
      setPrepTimeSaving(null);
    }
  };

  const handleDeleteItem = async (id: number, title: string) => {
    try {
      await adminDeleteMenuItem(id);
      setMenuItems(prev => prev.filter(m => m.id !== id));
      toast.success(`"${title}" o'chirildi`);
    } catch {
      toast.error("O'chirishda xatolik");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName) { toast.error("Kategoriya nomi kiriting"); return; }
    setCatSaving(true);
    try {
      const cat = await adminCreateCategory({ name: newCatName, image_url: newCatImage || "" });
      setCategories(prev => [...prev, cat]);
      setNewCatName(""); setNewCatImage("");
      toast.success(`"${cat.name}" kategoriyasi qo'shildi!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    try {
      await adminDeleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success(`"${name}" o'chirildi`);
    } catch {
      toast.error("O'chirishda xatolik");
    }
  };

  const handleSetBanner = async () => {
    if (!bannerInput) { toast.error("Banner URL kiriting"); return; }
    try {
      await adminSetBanner(bannerInput);
      setBannerUrl(bannerInput);
      setBannerInput("");
      toast.success("Banner yangilandi!");
    } catch {
      toast.error("Banner o'rnatishda xatolik");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex sticky top-0 h-screen w-64 flex-col gap-1 border-r border-border bg-card p-5">
          <div className="mb-6 pb-4 border-b border-border">
            <CandyLogo />
          </div>
          {sidebarItems.map((it) => {
            const Icon = it.icon;
            const active = section === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setSection(it.id)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                  active ? "bg-primary text-secondary shadow-[var(--shadow-soft)]" : "text-primary hover:bg-secondary/60"
                }`}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </button>
            );
          })}

          <button
            onClick={() => { logout(); navigate({ to: "/staff-login" }); }}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-primary hover:bg-secondary/60 mt-4"
          >
            <LogOut className="h-5 w-5" />
            Chiqish
          </button>

          <div className="mt-auto rounded-2xl bg-secondary p-4 text-xs text-primary">
            <div className="font-bold">Saxovat</div>
            <div className="opacity-70">v1.0 &bull; {isSuperAdmin ? "Admin paneli" : "Xodim paneli"}</div>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-center bg-card/95 backdrop-blur px-4 py-3 border-b border-border">
          <CandyLogo />
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border flex items-center px-2 py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex items-center gap-1 overflow-x-auto flex-1">
            {sidebarItems.map((it) => {
              const Icon = it.icon;
              const active = section === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() => setSection(it.id)}
                  className={`flex shrink-0 flex-col items-center justify-center gap-1 min-w-[70px] py-2 rounded-xl transition-colors ${
                    active ? "bg-primary text-secondary" : "text-primary/60 hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">{it.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { logout(); navigate({ to: "/staff-login" }); }}
            className="flex shrink-0 flex-col items-center justify-center gap-1 min-w-[70px] py-2 rounded-xl text-red-500 hover:bg-red-50 ml-1 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Chiqish</span>
          </button>
        </div>

        {/* Main */}
        <main className="min-w-0 flex-1 p-4 pb-24 md:p-10 md:pb-10 mt-16 md:mt-0">
          <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-primary">Boshqaruv paneli</h1>
              <p className="text-sm text-muted-foreground">
                {isSuperAdmin ? "Menyu, kategoriyalar va restoran kontenti" : "Restoran sayti va stol uchun QR"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMenuQrOpen(true)}
                className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-secondary shadow-sm hover:bg-primary/90 transition-colors"
              >
                <QrCode className="h-4 w-4" />
                Menyu QR
              </button>
              <div className="hidden md:flex items-center gap-3 rounded-full bg-card px-4 py-2 shadow-[var(--shadow-soft)]">
                <div className="h-9 w-9 rounded-full bg-primary text-secondary grid place-items-center font-bold">
                  {(user?.first_name?.charAt(0) || "U").toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary">
                    {user?.first_name} ({isSuperAdmin ? "Admin" : "Kassir"})
                  </div>
                  <div className="text-xs text-muted-foreground">Online</div>
                </div>
              </div>
            </div>
          </div>

          {section === "overview" && (
            <div className="space-y-6">
              {isSuperAdmin && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <StatCard icon={<UtensilsCrossed className="h-5 w-5" />} label="Menyudagi taomlar" value={menuLoading ? "..." : String(menuItems.length)} sub="Restoran menyusidagi mahsulotlar" />
                  <StatCard icon={<Layers className="h-5 w-5" />} label="Kategoriyalar" value={menuLoading ? "..." : String(categories.length)} sub="Menyudagi bo‘limlar" />
                  <StatCard icon={<Image className="h-5 w-5" />} label="Istoriyalar" value={storiesLoading ? "..." : String(adminStories.length)} sub="Mehmonlar uchun rasmlar" />
                </div>
              )}
              <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)]">
                <h2 className="font-display text-2xl font-bold text-foreground">Saxovat restoranini boshqarish</h2>
                <p className="mt-2 text-sm text-muted-foreground">{isSuperAdmin ? "Taomlar, narxlar, kategoriyalar va istoriyalarni shu yerdan boshqaring." : "Restoran saytini oching yoki stol uchun QR kodni ko‘ring."}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {isSuperAdmin && <button onClick={() => setSection("menu")} className="samarkand-button-primary min-h-11 rounded-xl px-5 font-semibold">Menyuni boshqarish</button>}
                  {isSuperAdmin && <button onClick={() => setSection("stories")} className="samarkand-button-secondary min-h-11 rounded-xl px-5 font-semibold">Istoriyalar</button>}
                  <a href="/" target="_blank" rel="noopener noreferrer" className="samarkand-button-secondary inline-flex min-h-11 items-center rounded-xl px-5 font-semibold">Restoran saytini ochish</a>
                  <button onClick={() => setMenuQrOpen(true)} className="samarkand-button-secondary flex min-h-11 items-center gap-2 rounded-xl px-5 font-semibold"><QrCode className="h-4 w-4" /> Stol QR kodi</button>
                </div>
              </div>
            </div>
          )}

          {/* Menu Management Section — Super Admin */}
          {section === "menu" && isSuperAdmin && (
            <div className="space-y-6" onMouseEnter={() => { if (!menuItems.length && !menuLoading) loadMenuData(); }}>
              {/* useEffect trigger - load data when section changes */}
              {menuLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {!menuLoading && (
                <>
                  {/* Banner Section */}
                  <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)]">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-secondary">
                        <Image className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold text-primary">Asosiy Banner Rasm</h2>
                        <p className="text-sm text-muted-foreground">Menyu sahifasining tepasiga qo'yiladigan rasm — galereadan tanlang</p>
                      </div>
                    </div>
                    <ImageUploader
                      currentUrl={bannerUrl}
                      previewClass="h-48"
                      label="Banner rasmini yuklash"
                      onUrl={(url) => {
                        if (url) {
                          adminSetBanner(url)
                            .then(() => { setBannerUrl(url); toast.success("Banner yangilandi!"); })
                            .catch(() => toast.error("Banner saqlashda xatolik"));
                        } else {
                          setBannerUrl("");
                        }
                      }}
                    />
                  </div>

                  {/* Categories Section */}
                  <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)]">
                    <h2 className="font-display text-xl font-bold text-primary mb-1">Kategoriyalar</h2>
                    <p className="text-sm text-muted-foreground mb-5">Menyu kategoriyalarini boshqaring</p>

                    {/* Category list */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {categories.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Hali kategoriya qo'shilmagan</p>
                      ) : (
                        categories.map(cat => (
                          <div key={cat.id} className="flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm font-semibold text-primary">
                            {cat.image_url && <img src={cat.image_url} alt={cat.name} className="h-5 w-5 rounded-full object-cover" />}
                            {cat.name}
                            <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-muted-foreground hover:text-red-500 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add category */}
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">Yangi kategoriya</p>
                      <input
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Kategoriya nomi (masalan: Salatlar)"
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                      />
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Kategoriya rasmi (ixtiyoriy)</label>
                        <ImageUploader
                          label="Kategoriya rasmi"
                          previewClass="h-24"
                          onUrl={(url) => setNewCatImage(url)}
                        />
                      </div>
                      <button
                        onClick={handleCreateCategory}
                        disabled={catSaving}
                        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-secondary disabled:opacity-60"
                      >
                        {catSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Kategoriya qo'shish
                      </button>
                    </div>
                  </div>

                  {/* Menu Items Section */}
                  <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)]">
                    <h2 className="font-display text-xl font-bold text-primary mb-1">Menyu Elementlari</h2>
                    <p className="text-sm text-muted-foreground mb-5">Taom va ichimliklar ro'yxatini boshqaring</p>

                    {/* Add item form */}
                    <div className="rounded-2xl bg-secondary/40 p-5 mb-6 border border-border space-y-3">
                      <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Yangi taom qo'shish</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Nomi *</label>
                          <input
                            value={newItemTitle}
                            onChange={(e) => setNewItemTitle(e.target.value)}
                            placeholder="Masalan: Laghman"
                            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Kategoriya *</label>
                          <select
                            value={newItemCategory}
                            onChange={(e) => setNewItemCategory(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">— tanlang —</option>
                            {categories.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Narxi (UZS) *</label>
                          <input
                            type="number"
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                            placeholder="50000"
                            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Rasm (galereadan)</label>
                          <div className="mt-1">
                            <ImageUploader
                              label="Taom rasmi"
                              previewClass="h-28"
                              onUrl={(url) => setNewItemImage(url)}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="new-item-prep-time" className="text-xs text-muted-foreground">Tayyorlanish vaqti (daqiqa) *</label>
                          <input id="new-item-prep-time" type="number" min="0" max="2147483647" step="1" value={newItemPrepTime} onChange={(event) => setNewItemPrepTime(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                          <p className="mt-1 text-xs text-muted-foreground">Masalan: 20. Tayyor taom uchun 0 kiriting.</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Tarkibi / Tavsifi</label>
                        <input
                          value={newItemDesc}
                          onChange={(e) => setNewItemDesc(e.target.value)}
                          placeholder="Masalan: mol go'shti, sabzavotlar, ziravorlar"
                          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <button
                        onClick={handleCreateItem}
                        disabled={itemSaving}
                        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-secondary disabled:opacity-60"
                      >
                        {itemSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Menyuga qo'shish
                      </button>
                    </div>

                    {/* Items table */}
                    {menuItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Hali taom qo'shilmagan</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-primary/70">
                            <tr>
                              <th className="px-4 py-3">Nomi</th>
                              <th className="px-4 py-3">Kategoriya</th>
                              <th className="px-4 py-3">Narxi</th>
                              <th className="px-4 py-3">Tayyorlanish (daqiqa)</th>
                              <th className="px-4 py-3 text-right">Amal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {menuItems.map(item => (
                              <tr key={item.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                                <td className="px-4 py-3 font-semibold text-primary flex items-center gap-3">
                                  {item.image_url && (
                                    <img src={item.image_url} alt={item.title} className="h-9 w-9 rounded-lg object-cover shrink-0" />
                                  )}
                                  {item.title}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">{item.category}</span>
                                </td>
                                <td className="px-4 py-3 font-bold text-[#c9a227]">{fmt(Number(item.price))}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <input type="number" min="0" max="2147483647" step="1" aria-label={`${item.title} tayyorlanish vaqti (daqiqa)`} value={prepTimeEdits[item.id] ?? String(item.prep_time)} disabled={prepTimeSaving === item.id} onChange={(event) => setPrepTimeEdits(edits => ({ ...edits, [item.id]: event.target.value }))} className="min-h-11 w-20 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                                    <button type="button" aria-label={`${item.title} vaqtini saqlash`} disabled={prepTimeSaving !== null || prepTimeEdits[item.id] === undefined || prepTimeEdits[item.id] === String(item.prep_time)} onClick={() => handleSavePrepTime(item)} className="samarkand-button-primary min-h-11 rounded-xl px-3 text-xs font-semibold disabled:opacity-50">{prepTimeSaving === item.id ? "Saqlanmoqda" : "Saqlash"}</button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => handleDeleteItem(item.id, item.title)}
                                    className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors ml-auto"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Stories Section */}
          {section === "stories" && isSuperAdmin && (
            <div className="space-y-6 max-w-4xl">
              {/* Add Story Form */}
              <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-secondary">
                    <Image className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-primary">Yangi istoriya qo'shish</h2>
                    <p className="text-sm text-muted-foreground">Restoran bosh sahifasidagi rasmlar</p>
                  </div>
                </div>
                <form onSubmit={handleSaveStory} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mavzu (rasm ostidagi yozuv) *</label>
                    <input
                      value={newStoryTitle}
                      onChange={(e) => setNewStoryTitle(e.target.value)}
                      placeholder="Masalan: Yangi desertlar"
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">Istoriya rasmi *</label>
                    <ImageUploader
                      onUrl={(url) => setNewStoryImage(url)}
                      label="Rasm yuklash"
                    />
                    {newStoryImage && (
                      <div className="mt-4">
                        <img src={newStoryImage} alt="Preview" className="h-48 w-32 object-cover rounded-2xl shadow-sm border border-border/50" />
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={storySaving}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-secondary shadow-[var(--shadow-soft)] disabled:opacity-60 mt-4"
                  >
                    {storySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Qo'shish</>}
                  </button>
                </form>
              </div>

              {/* Stories List */}
              <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold text-primary">Barcha istoriyalar</h2>
                  <button
                    onClick={loadStories}
                    disabled={storiesLoading}
                    className="rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-primary"
                  >
                    {storiesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yangilash"}
                  </button>
                </div>

                {adminStories.length === 0 && !storiesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Hali istoriyalar qo'shilmagan</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
                    {adminStories.map((story) => (
                      <div key={story.id} className="relative group rounded-3xl overflow-hidden shadow-sm border border-border/50 aspect-[9/16]">
                        <img src={story.image_url} alt={story.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                          <p className="text-white font-semibold text-sm line-clamp-2 leading-tight drop-shadow-md">
                            {story.title}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-red-500/80 text-white backdrop-blur shadow-sm transition-transform hover:scale-110 active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Section — Super Admin: Add Employee */}
          {section === "settings" && isSuperAdmin && (
            <div className="max-w-xl">
              <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-secondary">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-primary">Yangi xodim qo'shish</h2>
                    <p className="text-sm text-muted-foreground">Xodim hisobi yaratish</p>
                  </div>
                </div>

                <form onSubmit={handleCreateEmployee} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ism *</label>
                      <input
                        value={empFirstName}
                        onChange={(e) => setEmpFirstName(e.target.value)}
                        placeholder="Sardor"
                        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Familiya</label>
                      <input
                        value={empLastName}
                        onChange={(e) => setEmpLastName(e.target.value)}
                        placeholder="Aliyev"
                        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Telefon raqam *</label>
                    <input
                      value={empPhone}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (!val.startsWith("+998 ")) val = "+998 ";
                        setEmpPhone(val);
                      }}
                      placeholder="+998 90 123 45 67"
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Parol *</label>
                    <input
                      type="password"
                      value={empPassword}
                      onChange={(e) => setEmpPassword(e.target.value)}
                      placeholder="Kamida 4 ta belgi"
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={empLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-secondary shadow-[var(--shadow-soft)] disabled:opacity-60"
                  >
                    {empLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" /> Xodim yaratish
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Menu QR Modal */}
      <AnimatePresence>
        {menuQrOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-primary/60 backdrop-blur-sm px-6"
            onClick={() => setMenuQrOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-3xl bg-card p-6 shadow-[var(--shadow-elegant)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-2xl font-semibold text-primary">Saxovat</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Stol uchun restoran QR</div>
                </div>
                <button aria-label="QR oynasini yopish" onClick={() => setMenuQrOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div
                className="mt-5 grid place-items-center rounded-2xl p-6 relative overflow-hidden"
                style={{ background: "var(--gradient-gold)" }}
              >
                <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
                  <CandyLogo />
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-lg relative z-10">
                  <QRCodeSVG
                    value={new URL("/", window.location.href).href}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#352b27"
                    level="H"
                  />
                </div>
              </div>
              <p className="mt-5 text-center text-sm font-medium text-primary">
                Ushbu QR kodni chop etib restoran stollariga joylashtiring.
              </p>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Mehmonlar skaner qilib restoran sayti, to‘liq menyu, manzil va aloqani kirishsiz ochishadi.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, gold, green,
}: { icon: React.ReactNode; label: string; value: string; sub: string; gold?: boolean; green?: boolean }) {
  let bgClass = "bg-card";
  let style = {};
  let textClass = "text-primary";
  let iconBgClass = "bg-secondary";
  let subClass = "text-muted-foreground";

  if (gold) {
    bgClass = "";
    style = { background: "var(--gradient-burgundy)" };
    textClass = "text-[#f2de99]";
    iconBgClass = "bg-[#f2de99]/20";
    subClass = "text-[#f2de99]/70";
  } else if (green) {
    bgClass = "bg-emerald-50 border border-emerald-100";
    textClass = "text-emerald-900";
    iconBgClass = "bg-emerald-200/50";
    subClass = "text-emerald-700/80";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-4 sm:p-5 shadow-[var(--shadow-soft)] ${bgClass}`}
      style={style}
    >
      <div className={`flex items-start justify-between gap-2 ${textClass}`}>
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest opacity-70 leading-tight line-clamp-2">{label}</span>
        <span className={`grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full ${iconBgClass}`}>
          <div className="scale-75 sm:scale-100">{icon}</div>
        </span>
      </div>
      <div className="mt-2 sm:mt-3">
        <div className={`text-lg sm:text-2xl font-bold truncate ${textClass}`}>{value}</div>
        <div className={`text-[9px] sm:text-xs mt-1 truncate ${subClass}`}>{sub}</div>
      </div>
    </motion.div>
  );
}
