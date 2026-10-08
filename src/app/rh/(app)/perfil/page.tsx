import type { Metadata } from "next";
import { PerfilView } from "./view";

export const metadata: Metadata = { title: "Meu perfil" };

export default function PerfilPage() {
  return <PerfilView />;
}
