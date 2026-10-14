import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Plus, X, Loader2, MapPin, Menu, Phone, Clock, Send, Instagram } from "lucide-react";
import { fmt } from "@/lib/candy-data";
import { CandyLogo } from "@/components/CandyLogo";
import { toast } from "sonner";
import { getMenu, getShops, getPublicStories, getPublicCategories, type MenuItemAPI, type ShopLocationAPI, type StoryAPI, type MenuCategoryAPI } from "@/lib/api";
import { StoryViewer } from "@/components/StoryViewer";
import { SamarkandBackdrop } from "@/components/SamarkandBackdrop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Saxovat — Restoran" },
      { name: "description", content: "Saxovat restoran menyusi, taomlar, manzil va aloqa ma’lumotlari." },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [sticky, setSticky] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Menu and stories
  const [menuItems, setMenuItems] = useState<MenuItemAPI[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemAPI | null>(null);
  const [categories, setCategories] = useState<MenuCategoryAPI[]>([]);
  const [stories, setStories] = useState<StoryAPI[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);

  // Modals state
  const [shopsOpen, setShopsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shops, setShops] = useState<ShopLocationAPI[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  // Fetch menu and stories
  useEffect(() => {
    setMenuLoading(true);
    getMenu()
      .then(setMenuItems)
      .catch(() => { /* menu will remain empty */ })
      .finally(() => setMenuLoading(false));

    getPublicCategories()
      .then(setCategories)
      .catch(() => { /* categories will remain empty */ });

    getPublicStories()
      .then(setStories)
      .catch(() => { /* stories will remain empty */ });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!tabsRef.current) return;
      const r = tabsRef.current.getBoundingClientRect();
      setSticky(r.top <= 0);
      const menuTop = document.getElementById("menu-section")?.getBoundingClientRect().top;
      setMenuVisible(menuTop !== undefined && menuTop <= 140);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items = useMemo(
    () => (tab === "all" ? menuItems : menuItems.filter((m) => menuCategory(m.category).id === tab)),
    [tab, menuItems],
  );

  const menuCategories = useMemo(() => {
    const groups = new Map<string, { id: string; label: string }>();
    const categoryNames = menuItems.length > 0 ? menuItems.map(item => item.category) : categories.map(category => category.name);
    categoryNames.forEach(name => {
      const group = menuCategory(name);
      groups.set(group.id, group);
    });
    const order = ["salads", "hot", "drinks", "desserts"];
    return [...groups.values()].sort((a, b) => {
      const rank = (id: string) => order.includes(id) ? order.indexOf(id) : order.length;
      return rank(a.id) - rank(b.id);
    });
  }, [categories, menuItems]);

  const addToCart = (id: number, name: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    toast.success(`${name} qo'shildi`);
  };

  const loadShops = () => {
    setShopsOpen(true);
    if (shops.length > 0) return;
    setShopsLoading(true);
    getShops()
      .then(setShops)
      .catch((err) => toast.error(err.message || "Manzilni yuklashda xatolik"))
      .finally(() => setShopsLoading(false));
  };

  return (
    <div className="relative min-h-screen bg-page-background pb-28">
      <SamarkandBackdrop />
      <div className="relative z-10 mx-auto max-w-xl">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-5 pt-8 pb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Mehmondo‘stlik · Ta’m · An’ana</p>
            <h1 className="font-display mt-1 text-3xl font-bold text-foreground">
              <Link to="/staff-login" aria-label="Saxovat — Admin login" className="inline-flex min-h-11 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Saxovat</Link>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Dasturxonimizga xush kelibsiz</p>
          </div>
          <a href="tel:+998973530000" aria-label="Restoranga qo‘ng‘iroq qilish" className="samarkand-button-primary grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-[var(--shadow-soft)]">
            <Phone className="h-5 w-5" />
          </a>
        </header>

        {/* Stories */}
        {stories.length > 0 && (
          <div className="hide-scrollbar mt-2 flex gap-4 overflow-x-auto px-5 pb-2">
            {stories.map((s, idx) => (
              <div
                key={s.id}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer transition-transform active:scale-95"
                onClick={() => setActiveStoryIndex(idx)}
              >
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
                  <div className={`flex h-full w-full items-center justify-center rounded-full p-[2px] ${idx === 0 ? "bg-foreground" : "bg-background"}`}>
                    <img
                      src={idx === 0 ? "/saxovat-mark.svg" : s.image_url}
                      alt={idx === 0 ? "Saxovat" : s.title}
                      loading={idx < 3 ? "eager" : "lazy"}
                      decoding="async"
                      fetchPriority={idx < 2 ? "high" : "auto"}
                      width={64}
                      height={64}
                      className={`h-full w-full rounded-full ${idx === 0 ? "object-contain p-2" : "object-cover"}`}
                    />
                  </div>
                </div>
                <span className="text-[11px] font-medium text-foreground line-clamp-1 max-w-[72px] text-center">{idx === 0 ? "Saxovat" : s.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Story Viewer Modal */}
        {activeStoryIndex !== null && (
          <StoryViewer
            stories={stories}
            initialIndex={activeStoryIndex}
            onClose={() => setActiveStoryIndex(null)}
          />
        )}


        {/* Delivery contact */}
        <section aria-labelledby="delivery-heading" className="relative mx-5 mt-7 min-h-[240px] overflow-hidden rounded-[28px] bg-primary px-5 py-6 text-primary-foreground shadow-[var(--shadow-soft)] min-[480px]:min-h-[260px] min-[480px]:px-7">
          <div className="relative z-10">
            <h2 id="delivery-heading" className="font-display text-[30px] font-bold leading-none"><Link to="/staff-login" aria-label="Saxovat — Admin login" className="inline-flex min-h-11 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-foreground">Saxovat</Link></h2>
            <p className="mt-2 text-base font-semibold">Yetkazib berish</p>
            <p className="mt-3 max-w-[56%] text-[12px] leading-[18px] text-primary-foreground/90 min-[480px]:text-sm min-[480px]:leading-5">Mazali taomlar — manzilingizgacha. Buyurtma uchun qo‘ng‘iroq qiling.</p>
          </div>
          <a href="tel:+998973530000" className="absolute bottom-4 left-5 z-10 inline-flex min-h-11 items-center whitespace-nowrap text-[22px] font-bold leading-tight tracking-tight underline-offset-4 hover:underline min-[480px]:left-7 min-[480px]:text-[30px]">+998 97 353-00-00</a>
          <div aria-hidden="true" className="pointer-events-none absolute top-3 right-2 h-[168px] w-[44%] min-[360px]:h-[184px] min-[480px]:h-[224px]">
            <img src="/saxovat-courier.png" alt="" loading="lazy" decoding="async" width={1122} height={1402} className="h-full w-full object-contain object-right" />
          </div>
        </section>

        {/* Menu */}
        <div id="menu-section" className="mt-8 scroll-mt-4 px-5">
          <h2 className="text-[32px] min-[480px]:text-[38px] leading-tight font-bold text-foreground font-display">Menyu</h2>
          <p className="text-sm min-[480px]:text-base text-muted-foreground">Bugungi tanlovlar</p>
        </div>

        <div ref={tabsRef} className="sticky top-0 z-30 mt-3">
          <div
            className={`hide-scrollbar flex gap-2 overflow-x-auto px-5 py-3 transition-colors ${
              sticky ? "bg-page-background/95 backdrop-blur-md shadow-[var(--shadow-soft)]" : ""
            }`}
          >
            <button
              onClick={() => setTab("all")}
              aria-pressed={tab === "all"}
              className={`min-h-11 flex-1 shrink-0 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold ${
                tab === "all"
                  ? "samarkand-button-primary shadow-[var(--shadow-soft)]"
                  : "samarkand-button-secondary"
              }`}
            >
              Barchasi
            </button>
            {menuCategories.map((c) => {
              const active = tab === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setTab(c.id)}
                  aria-pressed={active}
                  className={`min-h-11 flex-1 shrink-0 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold ${
                    active
                      ? "samarkand-button-primary shadow-[var(--shadow-soft)]"
                      : "samarkand-button-secondary"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {menuLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-5 pt-1 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {items.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedMenuItem(m)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") setSelectedMenuItem(m);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${m.title} haqida batafsil`}
                  style={{ contentVisibility: "auto", containIntrinsicSize: "300px" }}
                  className="reference-menu-card flex flex-col overflow-hidden rounded-[20px] border border-border/70 bg-card cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <div className="relative aspect-[1.45] w-full shrink-0 overflow-hidden">
                    <img src={m.image_url} alt={m.title} loading="lazy" decoding="async" width={450} height={350} className="h-full w-full object-cover" />
                    <div className="absolute right-2.5 top-2.5 rounded-full bg-card/95 px-3 py-1 text-[11px] font-bold text-foreground min-[480px]:text-xs">
                      {(Number(m.price) / 1000).toFixed(0)}k
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-3 min-[480px]:p-3.5">
                    <div className="font-display line-clamp-2 text-[19px] font-bold leading-[1.12] text-foreground min-[480px]:text-[22px]">{m.title}</div>
                    <div className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-muted-foreground min-[480px]:text-xs">{m.description}</div>
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground" aria-label="Tayyorlanish vaqti">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {m.prep_time > 0 ? `${m.prep_time} daqiqa` : "Tayyor"}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-1 pt-3">
                      <div className="text-[14px] font-bold text-foreground min-[480px]:text-[18px]">{fmt(Number(m.price)).replace("so'm", "so‘m")}</div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(m.id, m.title);
                        }}
                        type="button"
                        className="samarkand-button-primary grid h-11 w-11 shrink-0 place-items-center rounded-full active:scale-95"
                        aria-label={`${m.title}ni savatga qo'shish`}
                      >
                        <Plus className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Menu item details */}
      <AnimatePresence>
        {selectedMenuItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-0 backdrop-blur-sm sm:items-center sm:px-5"
            onClick={() => setSelectedMenuItem(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 27, stiffness: 320 }}
              className="relative w-full max-w-md overflow-hidden rounded-t-[30px] bg-[#fffdf5] shadow-2xl sm:rounded-[30px]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`${selectedMenuItem.title} haqida`}
            >
              <div className="relative h-[310px] w-full bg-muted">
                <img
                  src={selectedMenuItem.image_url}
                  alt={selectedMenuItem.title}
                  decoding="async"
                  fetchPriority="high"
                  width={900}
                  height={700}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
                <button
                  onClick={() => setSelectedMenuItem(null)}
                  className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground shadow-lg backdrop-blur transition-transform active:scale-90"
                  aria-label="Yopish"
                >
                  <X className="h-5 w-5" />
                </button>
                {selectedMenuItem.is_new && (
                  <span className="absolute left-4 top-4 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-foreground shadow">
                    Yangi
                  </span>
                )}
              </div>

              <div className="p-5 pb-7">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    {selectedMenuItem.category}
                  </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-foreground/60" aria-label="Tayyorlanish vaqti">
                      <Clock className="h-3.5 w-3.5" />
                      {selectedMenuItem.prep_time > 0 ? `${selectedMenuItem.prep_time} daqiqa` : "Tayyor"}
                    </span>
                </div>
                <h3 className="font-display text-3xl font-bold leading-tight text-foreground">
                  {selectedMenuItem.title}
                </h3>
                <p className="mt-2 min-h-10 text-sm leading-relaxed text-foreground/65">
                  {selectedMenuItem.description || "Saxovat oshpazlari tomonidan nafis tayyorlangan taom."}
                </p>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-foreground/50">Narxi</div>
                    <div className="text-2xl font-bold text-foreground">{fmt(Number(selectedMenuItem.price))}</div>
                  </div>
                  <button
                    onClick={() => addToCart(selectedMenuItem.id, selectedMenuItem.title)}
                    className="samarkand-button-primary flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-[var(--shadow-soft)] active:scale-[0.97]"
                  >
                    <Plus className="h-5 w-5" />
                    Savatga qo'shish
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(25,63,52,0.07)]">
        <div className="mx-auto max-w-xl px-2 pb-3 pt-2">
          <div className="grid grid-cols-4 items-end justify-items-center">
            <NavBtn icon={<Home className="h-6 w-6" fill={!menuVisible && !shopsOpen && !moreOpen ? "currentColor" : "none"} />} label="Asosiy" active={!menuVisible && !shopsOpen && !moreOpen} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
            <NavBtn icon={<Menu className="h-6 w-6" />} label="Menyu" active={menuVisible && !shopsOpen && !moreOpen} onClick={() => document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth" })} />
            <NavBtn icon={<MapPin className="h-6 w-6" />} label="Manzil" active={shopsOpen} onClick={loadShops} />
            <NavBtn icon={<Phone className="h-6 w-6" />} label="Aloqa" active={moreOpen} onClick={() => setMoreOpen(true)} />
          </div>
          {Object.keys(cart).length > 0 && (
            <div className="pointer-events-none absolute -top-8 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-foreground/40 bg-gradient-to-t from-white to-transparent pt-4">
              Savatda {Object.values(cart).reduce((a, b) => a + b, 0)} ta tanlov
            </div>
          )}
        </div>
      </nav>

      {/* Shops Modal */}
      <AnimatePresence>
        {shopsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShopsOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-3xl bg-background shadow-xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
                <h3 className="font-display text-xl font-bold text-foreground">Bizning restoran</h3>
                <button
                  onClick={() => setShopsOpen(false)}
                  aria-label="Yopish" className="grid h-11 w-11 place-items-center rounded-full bg-gray-100 text-muted-foreground transition-colors active:bg-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-5" style={{ maxHeight: "calc(85vh - 70px)" }}>
                {shopsLoading ? (
                  <div className="flex py-10 justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#420b1a]" />
                  </div>
                ) : shops.length === 0 ? (
                  <div className="py-10 text-center">
                    <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-muted-foreground font-medium">Manzil ma’lumotlari hali kiritilmagan</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {shops.map((s) => (
                      <div key={s.id} className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex h-28 items-center justify-center bg-secondary text-secondary-foreground">
                          <CandyLogo />
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-foreground text-lg">{s.name}</h4>
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-foreground" />
                              <span>{s.address}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <div className="h-4 w-4 shrink-0 mt-0.5 grid place-items-center"><div className="w-2 h-2 rounded-full border-2 border-primary"></div></div>
                              <span>Ish vaqti: {s.working_hours}</span>
                            </div>
                          </div>
                          {s.map_link ? (
                            <a
                              href={s.map_link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-[#fffae6] border border-[#f2de99]/50 py-2.5 text-sm font-semibold text-[#420b1a] transition-colors hover:bg-[#f2de99]/20"
                            >
                              Xaritada ko'rish
                            </a>
                          ) : (
                            <div className="mt-4 w-full overflow-hidden rounded-xl border border-gray-100 shadow-sm">
                              <iframe
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(`${s.address}, Qarshi`)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                                width="100%"
                                height="200"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* More Modal */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-3xl bg-background shadow-xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
                <h3 className="font-display text-xl font-bold text-foreground">Saxovat</h3>
                <button
                  onClick={() => setMoreOpen(false)}
                  aria-label="Yopish" className="grid h-11 w-11 place-items-center rounded-full bg-gray-100 text-muted-foreground transition-colors active:bg-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-5 space-y-6">
                <div
                  className="samarkand-member-card rounded-[26px] p-5 border border-white/10 shadow-[var(--shadow-elegant)] relative overflow-hidden"
                >
                  <div className="flex flex-col items-center text-center mb-5 relative z-10">
                    <CandyLogo className="text-primary-foreground [&_.samarkand-wordmark]:text-4xl [&_.samarkand-mark]:h-14 [&_.samarkand-mark]:w-14" />
                  </div>
                  <div className="space-y-3 text-sm relative z-10">
                     <div className="flex justify-between items-center bg-[#fffdf7]/95 p-3.5 rounded-xl shadow-sm border border-white/50">
                        <span className="font-medium text-foreground/60">Ish vaqti</span>
                        <span className="font-bold text-foreground">08:00 - 00:00</span>
                     </div>
                     <div className="flex justify-between items-center bg-[#fffdf7]/95 p-3.5 rounded-xl shadow-sm border border-white/50">
                        <span className="font-medium text-foreground/60">Bog'lanish</span>
                        <a href="tel:+998973530000" className="font-bold text-primary underline-offset-4 hover:underline">+998 97 353-00-00</a>
                     </div>
                  </div>
                  <div className="mt-6 text-center font-display italic text-primary-foreground text-xl relative z-10">
                    Mehmondo'stlik · Ta'm · An'ana
                  </div>
                  <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
                    <a href="https://t.me/SAXOVAT_OILAVIY" target="_blank" rel="noopener noreferrer" aria-label="Saxovat Telegram sahifasi" className="samarkand-button-primary flex min-h-14 items-center justify-center gap-2 rounded-xl px-3 py-3">
                      <Send className="h-5 w-5" />
                      <span className="text-left"><span className="block text-sm font-semibold">Telegram</span><span className="block text-[10px] opacity-80">@SAXOVAT_OILAVIY</span></span>
                    </a>
                    <button type="button" onClick={() => toast.info("Saxovat Instagram sahifasi — tez kunda")} className="samarkand-button-secondary flex min-h-14 items-center justify-center gap-2 rounded-xl px-3 py-3">
                      <Instagram className="h-5 w-5" />
                      <span className="text-left"><span className="block text-sm font-semibold">Instagram</span><span className="block text-[10px] opacity-80">Tez kunda</span></span>
                    </button>
                  </div>

                </div>


              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function menuCategory(name: string) {
  const value = name.trim().toLowerCase();
  if (/^(салаты|salatlar|salads)$/.test(value)) return { id: "salads", label: "Salatlar" };
  if (/напитки|кофе|ichimlik|coffee|kofe/.test(value)) return { id: "drinks", label: "Ichimliklar" };
  if (/десерт|shirinlik|dessert|tortlar/.test(value)) return { id: "desserts", label: "Shirinliklar" };
  if (/^(второе блюдо|первое блюдо|candy tovuq qizilcha|issiq taomlar|birinchi taomlar)$/.test(value)) return { id: "hot", label: "Issiq taomlar" };
  return { id: `category:${name}`, label: name };
}

function NavBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 w-full flex-col items-center gap-1 text-[10px] font-semibold transition-colors pb-1 ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
