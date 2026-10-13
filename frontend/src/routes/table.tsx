import { createFileRoute, redirect } from "@tanstack/react-router";

// Keep printed menu QR links working with the complete restaurant website.
export const Route = createFileRoute("/table")({
  beforeLoad: () => { throw redirect({ to: "/", search: true, replace: true }); },
});
