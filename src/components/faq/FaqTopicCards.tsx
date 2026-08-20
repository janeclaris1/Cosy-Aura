"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

export type FaqGalleryImage = {
  url: string;
  alt: string;
};

type FaqTopic = {
  id: string;
  title: string;
  cta: string;
};

function pickRandomImages(
  count: number,
  pool: FaqGalleryImage[]
): FaqGalleryImage[] {
  if (pool.length === 0) return [];
  if (pool.length <= count) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    while (shuffled.length < count) {
      shuffled.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return shuffled.slice(0, count);
  }

  const copy = [...pool];
  const picked: FaqGalleryImage[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(Math.random() * copy.length);
    picked.push(copy[index]);
    copy.splice(index, 1);
  }
  return picked;
}

function RotatingCircle({
  image,
  title,
}: {
  image: FaqGalleryImage;
  title: string;
}) {
  return (
    <span className="relative block w-44 h-44 mx-auto rounded-full overflow-hidden border border-wf-border bg-wf-light">
      <Image
        key={image.url}
        src={image.url}
        alt={image.alt || title}
        fill
        className="object-cover transition-opacity duration-500 ease-in-out"
        sizes="176px"
      />
    </span>
  );
}

export function FaqTopicCards({
  topics,
  imagePool,
}: {
  topics: FaqTopic[];
  imagePool: FaqGalleryImage[];
}) {
  const slotCount = topics.length;
  const [slotImages, setSlotImages] = useState<FaqGalleryImage[]>(() =>
    pickRandomImages(slotCount, imagePool)
  );

  const rotate = useCallback(() => {
    setSlotImages(pickRandomImages(slotCount, imagePool));
  }, [imagePool, slotCount]);

  useEffect(() => {
    if (imagePool.length === 0) return;
    const timer = window.setInterval(rotate, 5000);
    return () => window.clearInterval(timer);
  }, [imagePool.length, rotate]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
      {topics.map((topic, index) => (
        <article key={topic.id} className="text-center">
          <a href={`#${topic.id}`} className="inline-block group">
            {slotImages[index] ? (
              <div className="transition-transform duration-300 group-hover:scale-[1.02]">
                <RotatingCircle image={slotImages[index]} title={topic.title} />
              </div>
            ) : (
              <span className="relative block w-44 h-44 mx-auto rounded-full border border-wf-border bg-wf-light" />
            )}
          </a>
          <h2 className="text-2xl text-wf-black mt-5">{topic.title}</h2>
          <a
            href={`#${topic.id}`}
            className="inline-block mt-4 border border-wf-border px-5 py-2 text-sm hover:border-gold hover:text-gold transition-colors"
          >
            {topic.cta}
          </a>
        </article>
      ))}
    </div>
  );
}
