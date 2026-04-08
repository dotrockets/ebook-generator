"use client";

import { useState, useEffect } from "react";

interface ShopBook {
  id: string;
  title: string;
  subtitle: string;
  authors: string[];
  chapters: string[];
  wordCount: number;
  pages: number;
  category: string | null;
  description: string | null;
  keywords: string[];
  hasCover: boolean;
  createdAt: string;
}

function BookCard({
  book,
  onBuy,
  buying,
}: {
  book: ShopBook;
  onBuy: (id: string) => void;
  buying: string | null;
}) {
  const coverUrl = book.hasCover
    ? `/api/library/download?id=${book.id}&format=cover`
    : null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">
      {/* Cover */}
      <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center p-6">
            <h3 className="text-white text-center font-bold text-lg leading-tight">
              {book.title}
            </h3>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1">
          {book.title}
        </h3>
        {book.subtitle && (
          <p className="text-gray-500 text-sm mb-2 leading-relaxed">
            {book.subtitle}
          </p>
        )}

        <p className="text-gray-400 text-xs mb-3">
          von {book.authors.join(", ")}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {book.chapters?.length || "?"} Kapitel
          </span>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {book.wordCount?.toLocaleString("de-DE") || "?"} Wörter
          </span>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            PDF
          </span>
        </div>

        {/* Chapters preview */}
        {book.chapters?.length > 0 && (
          <details className="mb-4 group">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
              Inhaltsverzeichnis anzeigen
            </summary>
            <ol className="mt-2 text-xs text-gray-500 space-y-0.5 list-decimal list-inside">
              {book.chapters.map((ch, i) => (
                <li key={i}>{ch}</li>
              ))}
            </ol>
          </details>
        )}

        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900">
            9,99 <span className="text-sm font-normal text-gray-400">EUR</span>
          </span>
          <button
            onClick={() => onBuy(book.id)}
            disabled={buying === book.id}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buying === book.id ? "..." : "Kaufen"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-[3/4] bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-16" />
          <div className="h-9 bg-gray-200 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [books, setBooks] = useState<ShopBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/shop", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setBooks(data.books || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleBuy(bookId: string) {
    setBuying(bookId);
    try {
      const resp = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Checkout fehlgeschlagen");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Checkout");
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Ebook Shop
            </h1>
            <p className="text-xs text-gray-400">
              Sofort-Download nach Kauf
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Sichere Zahlung via Stripe
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Praxisnahe Ratgeber-Ebooks
          </h2>
          <p className="text-gray-500 text-base max-w-2xl mx-auto">
            Kompakte Ratgeber zu den wichtigsten Themen — von Experten geschrieben,
            sofort als PDF herunterladbar.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onBuy={handleBuy}
                  buying={buying}
                />
              ))}
        </div>

        {/* Empty */}
        {!loading && books.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-gray-400">
              Noch keine Ebooks im Shop. Komm bald wieder!
            </p>
          </div>
        )}

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            SSL-verschlüsselt
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Kreditkarte, Apple Pay, Google Pay
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Sofort-Download nach Zahlung
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16 py-6 text-center text-xs text-gray-400">
        <p>Digitale Produkte — kein Widerrufsrecht nach Download</p>
      </footer>
    </div>
  );
}
