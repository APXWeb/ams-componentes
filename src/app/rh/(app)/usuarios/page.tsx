import type { Metadata } from "next";
import { UsuariosView } from "./view";

export const metadata: Metadata = { title: "Usuários e acessos" };

export default function UsuariosPage() {
  return <UsuariosView />;
}
