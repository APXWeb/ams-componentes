"use client";

import { useSyncExternalStore } from "react";
import { createSeed, DEMO_VERSION } from "./seed";
import type { CurrentUser, DemoData } from "./types";

/*
 * Estado da demonstração, inteiro no navegador. Persiste em localStorage para que a apresentação
 * sobreviva a recarregamentos e abas novas (ex.: "Ver no site"), e é gerado de novo a cada dia,
 * porque as datas da demo são relativas a hoje. Para a versão real, este módulo é o ponto de
 * troca: as telas leem por useDemoData()/useDemoUser() e escrevem por mutate().
 */

const DATA_KEY = "ams-demo:data";
const SESSION_KEY = "ams-demo:session";
const DEFAULT_USER_ID = 2; // Mariana Campos (RH): perfil mais completo para quem chega por link direto

let data: DemoData | null = null;
let sessionUserId: number | null = null;
const listeners = new Set<() => void>();

const today = () => new Date().toLocaleDateString("sv-SE");

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // modo privado ou cota cheia: a demo segue funcionando só em memória
  }
}

function load(): DemoData {
  const saved = read<DemoData>(DATA_KEY);
  if (saved && saved.version === DEMO_VERSION && saved.seededOn === today()) return saved;
  const fresh = createSeed();
  write(DATA_KEY, fresh);
  return fresh;
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    // outra aba alterou a demo (ex.: candidatura enviada pelo site)
    if (e.key === DATA_KEY) data = load();
    if (e.key === SESSION_KEY) sessionUserId = read<number>(SESSION_KEY);
    if (e.key === DATA_KEY || e.key === SESSION_KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getData(): DemoData {
  if (!data) data = load();
  return data;
}

/** Aplica uma alteração e notifica as telas. Equivale a uma transação no backend real. */
export function mutate<T>(fn: (d: DemoData) => T): T {
  const next = structuredClone(getData());
  const result = fn(next);
  data = next;
  write(DATA_KEY, next);
  emit();
  return result;
}

/** Próximo id de uma tabela (auto incremento). Use dentro de mutate(). */
export function nextId(d: DemoData, table: keyof DemoData) {
  const k = String(table);
  d.seq[k] = (d.seq[k] ?? 0) + 1;
  return d.seq[k];
}

export function resetDemo() {
  data = createSeed();
  write(DATA_KEY, data);
  emit();
}

/* ------------------------------------------------------------ sessão demo */

function getSessionId() {
  if (sessionUserId == null) sessionUserId = read<number>(SESSION_KEY);
  return sessionUserId;
}

export function signIn(userId: number) {
  sessionUserId = userId;
  write(SESSION_KEY, userId);
  emit();
}

export function signOut() {
  sessionUserId = null;
  write(SESSION_KEY, null);
  emit();
}

export function hasSession() {
  return getSessionId() != null;
}

export function currentUser(d: DemoData = getData()): CurrentUser {
  const id = getSessionId() ?? DEFAULT_USER_ID;
  const u = d.users.find((x) => x.id === id && x.active) ?? d.users.find((x) => x.id === DEFAULT_USER_ID)!;
  const emp = u.employeeId ? d.employees.find((e) => e.id === u.employeeId) : undefined;
  return { id: u.id, name: u.name, email: u.email, role: u.role, employeeId: u.employeeId, departmentId: emp?.departmentId ?? null };
}

/* ------------------------------------------------------------------ hooks */

// no servidor (e na hidratação) não há dados: as telas mostram o esqueleto de carregamento
const serverSnapshot = () => null;
const sessionSnapshot = () => getSessionId() ?? DEFAULT_USER_ID;

export function useDemoData(): DemoData | null {
  return useSyncExternalStore(subscribe, getData, serverSnapshot);
}

export function useDemoUser(): CurrentUser | null {
  const d = useDemoData();
  const id = useSyncExternalStore(subscribe, sessionSnapshot, serverSnapshot);
  return d && id ? currentUser(d) : null;
}

/** Simula a latência de uma chamada de API, para os estados de carregamento aparecerem. */
export function latency(min = 380, max = 760) {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}
