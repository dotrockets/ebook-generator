"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const bookId = searchParams.get("book_id");

  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId || !bookId) {
      setError("Ungültiger Link");
      setLoading(false);
      return;
    }

    fetch(
      `/api/shop/verify?session_id=${encodeURIComponent(sessionId)}&book_id=${encodeURIComponent(bookId)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.paid) {
          setVerified(true);
        } else {
          setError(data.error || "Zahlung konnte nicht bestätigt werden");
        }
      })
      .catch(() => setError("Verifizierung fehlgeschlagen"))
      .finally(() => setLoading(false));
  }, [sessionId, bookId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Zahlung wird überprüft...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Fehler
          </h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <a
            href="/shop"
            className="text-violet-600 hover:text-violet-700 font-medium text-sm"
          >
            Zurück zum Shop
          </a>
        </div>
      </div>
    );
  }

  if (!verified || !bookId) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Vielen Dank!
        </h1>
        <p className="text-gray-500 mb-8">
          Deine Zahlung war erfolgreich. Lade jetzt dein Ebook herunter.
        </p>

        <a
          href={`/api/library/download?id=${bookId}&format=pdf`}
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          PDF herunterladen
        </a>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <a
            href="/shop"
            className="text-violet-600 hover:text-violet-700 font-medium text-sm"
          >
            Weitere Ebooks entdecken
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
