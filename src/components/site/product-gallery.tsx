"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  if (!images.length) return null;
  return (
    <div className="gallery">
      <div className="gallery__main">
        <Image key={images[i]} src={images[i]} alt={`${name}, imagem ${i + 1} de ${images.length}`} width={700} height={700} sizes="(max-width: 900px) 92vw, 46vw" priority={i === 0} />
        <span className="gallery__ref">
          IMG {String(i + 1).padStart(2, "0")}/{String(images.length).padStart(2, "0")}
        </span>
      </div>
      {images.length > 1 ? (
        <div className="gallery__thumbs" role="group" aria-label="Outras imagens do produto">
          {images.map((src, n) => (
            <button key={src} type="button" aria-current={n === i} aria-label={`Ver imagem ${n + 1}`} onClick={() => setI(n)}>
              <Image src={src} alt="" width={96} height={96} sizes="72px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
