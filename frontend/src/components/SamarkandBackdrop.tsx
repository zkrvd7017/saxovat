export function SamarkandBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-page-background"
      style={{ backgroundImage: "radial-gradient(ellipse at 0% 0%, rgba(232,200,176,.28), transparent 55%), radial-gradient(ellipse at 100% 90%, rgba(224,184,160,.12), transparent 48%)" }}
    />
  );
}
