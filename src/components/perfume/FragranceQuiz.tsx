"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Flower2 } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { useLocaleStore } from "@/lib/locale-store";
import Image from "next/image";

type QuizFragrance = {
  id: string;
  slug: string;
  model: string;
  price: number;
  fragranceFamily: string;
  sillage: string;
  gender: string;
  sustainabilityScore?: number;
  isVegan?: boolean;
  isCrueltyFree?: boolean;
  brand: { name: string };
  images: { url: string; alt: string | null }[];
};

type AnswerMap = {
  mood?: string;
  family?: string;
  timeOfDay?: string;
  strength?: string;
  gender?: string;
  budget?: string;
  sustainability?: string;
};

const QUESTIONS: {
  id: keyof AnswerMap;
  prompt: string;
  options: { value: string; label: string }[];
}[] = [
  {
    id: "mood",
    prompt: "What mood are you dressing for?",
    options: [
      { value: "romantic", label: "Romantic" },
      { value: "confident", label: "Confident" },
      { value: "calm", label: "Calm & clean" },
      { value: "playful", label: "Playful" },
    ],
  },
  {
    id: "family",
    prompt: "Which scent family draws you in?",
    options: [
      { value: "FLORAL", label: "Floral" },
      { value: "ORIENTAL", label: "Oriental" },
      { value: "WOODY", label: "Woody" },
      { value: "FRESH", label: "Fresh" },
      { value: "CITRUS", label: "Citrus" },
      { value: "SPICY", label: "Spicy" },
    ],
  },
  {
    id: "timeOfDay",
    prompt: "When will you wear it most?",
    options: [
      { value: "day", label: "Daytime" },
      { value: "evening", label: "Evening" },
      { value: "both", label: "Anytime" },
    ],
  },
  {
    id: "strength",
    prompt: "How strong should the sillage feel?",
    options: [
      { value: "SUBTLE", label: "Subtle" },
      { value: "MODERATE", label: "Moderate" },
      { value: "INTENSE", label: "Intense" },
      { value: "POWERFUL", label: "Powerful" },
    ],
  },
  {
    id: "gender",
    prompt: "Gender preference?",
    options: [
      { value: "MENS", label: "Men's" },
      { value: "WOMENS", label: "Women's" },
      { value: "UNISEX", label: "Unisex / open" },
    ],
  },
  {
    id: "budget",
    prompt: "What's your budget?",
    options: [
      { value: "under150", label: "Under $150" },
      { value: "150to250", label: "$150 - $250" },
      { value: "over250", label: "$250+" },
    ],
  },
  {
    id: "sustainability",
    prompt: "How important is sustainability?",
    options: [
      { value: "must", label: "Must-have (vegan / high score)" },
      { value: "nice", label: "Nice to have" },
      { value: "any", label: "Not a priority" },
    ],
  },
];

function scoreFragrance(f: QuizFragrance, a: AnswerMap): number {
  let score = 0;
  if (a.family && f.fragranceFamily === a.family) score += 4;
  if (a.strength && f.sillage === a.strength) score += 2;
  if (a.gender === "UNISEX" || f.gender === a.gender || f.gender === "UNISEX")
    score += 2;
  if (a.budget === "under150" && f.price < 150) score += 2;
  if (a.budget === "150to250" && f.price >= 150 && f.price <= 250) score += 2;
  if (a.budget === "over250" && f.price > 250) score += 2;
  if (a.sustainability === "must") {
    if (f.isVegan) score += 2;
    if ((f.sustainabilityScore ?? 0) >= 4) score += 2;
    if (f.isCrueltyFree) score += 1;
  } else if (a.sustainability === "nice" && (f.sustainabilityScore ?? 0) >= 3) {
    score += 1;
  }
  if (a.timeOfDay === "evening" && ["ORIENTAL", "WOODY", "SPICY"].includes(f.fragranceFamily))
    score += 1;
  if (a.timeOfDay === "day" && ["FRESH", "CITRUS", "FLORAL"].includes(f.fragranceFamily))
    score += 1;
  if (a.mood === "romantic" && ["FLORAL", "ORIENTAL"].includes(f.fragranceFamily)) score += 1;
  if (a.mood === "confident" && ["WOODY", "SPICY", "ORIENTAL"].includes(f.fragranceFamily))
    score += 1;
  if (a.mood === "calm" && ["FRESH", "CITRUS"].includes(f.fragranceFamily)) score += 1;
  if (a.mood === "playful" && ["CITRUS", "FLORAL", "SPICY"].includes(f.fragranceFamily))
    score += 1;
  return score;
}

interface FragranceQuizProps {
  catalog: QuizFragrance[];
  className?: string;
}

export function FragranceQuiz({ catalog, className }: FragranceQuizProps) {
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [done, setDone] = useState(false);

  const progress = done ? 100 : ((step + 1) / QUESTIONS.length) * 100;
  const question = QUESTIONS[step];

  const matches = useMemo(() => {
    if (!done) return [];
    return [...catalog]
      .map((f) => ({ f, score: scoreFragrance(f, answers) }))
      .sort((a, b) => b.score - a.score || a.f.price - b.f.price)
      .slice(0, 5)
      .map((x) => x.f);
  }, [done, catalog, answers]);

  function select(value: string) {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    if (step >= QUESTIONS.length - 1) {
      setDone(true);
    } else {
      setStep((s) => s + 1);
    }
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setDone(false);
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-wf-border bg-surface p-6 md:p-8",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Flower2 className="w-5 h-5 text-secondary" />
        <h2 className="font-playfair text-2xl md:text-3xl">Fragrance Finder</h2>
      </div>
      <p className="text-sm text-mocha mb-6 font-cormorant text-lg">
        Seven questions to match your mood, notes, and values.
      </p>

      <div className="h-2 rounded-full bg-accent mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-secondary via-highlight to-primary transition-all duration-organic ease-organic"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!done ? (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-mocha mb-2">
            Question {step + 1} of {QUESTIONS.length}
          </p>
          <h3 className="font-playfair text-xl mb-5">{question.prompt}</h3>
          <div className="grid sm:grid-cols-2 gap-2.5 mb-6">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => select(opt.value)}
                className={cn(
                  "text-left rounded-lg border border-wf-border px-4 py-3.5 text-sm",
                  "hover:border-highlight hover:bg-highlight-light/20 transition-all duration-organic ease-organic",
                  answers[question.id] === opt.value &&
                    "border-highlight bg-highlight-light/30"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-1 text-sm text-mocha disabled:opacity-40 hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              disabled={!answers[question.id]}
              onClick={() => {
                if (step >= QUESTIONS.length - 1) setDone(true);
                else setStep((s) => s + 1);
              }}
              className="inline-flex items-center gap-1 text-sm text-primary disabled:opacity-40"
            >
              Skip / Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="font-playfair text-xl mb-2">Your matches</h3>
          <p className="text-sm text-mocha mb-6">
            {matches.length
              ? "Based on your answers, these fragrances are the closest fit."
              : "No strong matches yet - browse the full collection."}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {matches.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border border-wf-border overflow-hidden bg-ivory/40"
              >
                <div className="relative aspect-square bg-white">
                  <Image
                    src={f.images[0]?.url || "/images/placeholders/fragrance.svg"}
                    alt={f.model}
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                </div>
                <div className="p-3">
                  <p className="text-[10px] uppercase tracking-wider text-mocha">
                    {f.brand.name}
                  </p>
                  <p className="text-sm font-medium text-espresso line-clamp-2">
                    {f.model}
                  </p>
                  <p className="font-playfair text-highlight mt-1">
                    {formatPrice(f.price, currency)}
                  </p>
                  <Link
                    href={`/fragrances/${f.slug}`}
                    className="btn-gold mt-3 w-full text-center text-sm py-2.5 block"
                  >
                    View fragrance
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={restart} className="btn-outline">
              Retake quiz
            </button>
            <Link href="/fragrances" className="btn-gold">
              Browse all fragrances
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
