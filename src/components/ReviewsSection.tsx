import Link from "next/link";

interface ReviewsSectionProps {
  teaser?: boolean;
}

/**
 * Google rating display + testimonial cards. Structured so the static
 * placeholder data below can be swapped for the Google Places API later
 * without changing markup.
 */
const GOOGLE_RATING = {
  rating: 4.9,
  reviewCount: 190,
};

// Real Google reviews (lightly trimmed for length; typos cleaned).
const TESTIMONIALS = [
  {
    name: "Quindol",
    location: "Google review",
    rating: 5,
    text: "This dealership hands down has had the best customer service I've ever experienced. The owner Ryan was extremely knowledgeable and helpful when it came to satisfying any concerns I had about the car, and very transparent. Nowadays a lot of dealerships are trying to get over on people, so it's refreshing to see people who actually care about their customers. 10/10 would recommend shopping here.",
  },
  {
    name: "Kimberly Saunders",
    location: "Google review",
    rating: 5,
    text: "The RydeTime Auto team are awesome. They provided great customer service and a friendly environment. The finance team explained everything step-by-step in plain words. I really appreciated that they made my car buying experience positive and memorable. I would definitely come back for a repeat purchase. Thank you, Dawn and the RydeTime Auto team.",
  },
  {
    name: "Jazzy Piercey",
    location: "Google review",
    rating: 5,
    text: "This was an AMAZING experience! Genuine and upfront people. I have never had a better car buying experience in my life. They work with you and are just so nice. 10/10 recommend — and when I need to purchase a car for my daughter when she starts driving, I will go to them!",
  },
  {
    name: "Jo Maume",
    location: "Google review",
    rating: 5,
    text: "Ryan and Dawn are a down to earth mom and son team. I highly recommend a used car purchase from them. Ryan takes his time to answer questions and was sincere with his responses. Even though the inventory is small, it is cherry picked from his sources. Best hassle-free car purchase I have ever experienced.",
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? "#CC0000" : "none"}
          stroke={i <= Math.round(rating) ? "#CC0000" : "#2A2A2A"}
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsSection({ teaser = false }: ReviewsSectionProps) {
  return (
    <div>
      {/* Google rating summary */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex items-center gap-3">
          <span className="tabular text-4xl font-bold text-text-primary">
            {GOOGLE_RATING.rating}
          </span>
          <div>
            <Stars rating={GOOGLE_RATING.rating} />
            <p className="mt-1 text-xs text-text-muted">
              Based on {GOOGLE_RATING.reviewCount}+ Google reviews
            </p>
          </div>
        </div>
        <p className="text-sm text-text-secondary sm:border-l sm:border-border-subtle sm:pl-5">
          Real customers from across Hampton Roads.
        </p>
      </div>

      {/* Testimonial cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className="flex flex-col rounded-lg border border-border-subtle bg-background-card p-5"
          >
            <Stars rating={t.rating} />
            <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
              &ldquo;{t.text}&rdquo;
            </blockquote>
            <figcaption className="mt-4">
              <p className="text-sm font-semibold text-text-primary">{t.name}</p>
              <p className="text-xs text-text-muted">{t.location}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      {teaser && (
        <div className="mt-8 text-center">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary transition-colors hover:text-accent"
          >
            Read more reviews
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
