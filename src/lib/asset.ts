/** Caminho de um arquivo de public/ considerando o subcaminho da publicação (GitHub Pages). */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
