import { createFileRoute } from "@tanstack/react-router";
import { Forge } from "@/components/forge/Forge";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <Forge />;
}
