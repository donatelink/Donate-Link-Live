import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";

// Stripe sends the donor back here after checkout (or after they cancel). The
// page asks the server to check the payment with Stripe directly, so the
// donation is confirmed even if the webhook hasn't arrived yet.
export default function DonationSuccess() {
  const router = useRouter();
  const { donation: donationId, canceled } = router.query;
  const [status, setStatus] = useState("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const [donation, setDonation] = useState(null);

  useEffect(() => {
    if (!router.isReady || !donationId) return;
    let active = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth/login");
        return;
      }

      async function sync() {
        const res = await fetch("/api/stripe/sync-donation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ donationId, cancel: canceled === "1" }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Could not check the payment");
        return body.status;
      }

      try {
        // A just-paid session can take a moment to show as paid — retry briefly.
        let result = await sync();
        for (let i = 0; i < 4 && result === "pending" && canceled !== "1"; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          result = await sync();
        }
        const { data } = await supabase
          .from("donations")
          .select("id, amount, ngo_name, stage, payment_status")
          .eq("id", donationId)
          .maybeSingle();
        if (!active) return;
        setDonation(data || null);
        setStatus(data?.payment_status === "paid" ? "paid" : result);
      } catch (err) {
        if (!active) return;
        setErrorMsg(err.message);
        setStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [router, donationId, canceled]);

  const views = {
    checking: {
      icon: "⏳",
      title: "Confirming your payment…",
      text: "Checking with Stripe. This only takes a moment.",
    },
    paid: {
      icon: "✅",
      title: "Donation confirmed",
      text: donation
        ? `Your $${Number(donation.amount).toFixed(2)} donation to ${donation.ngo_name} was paid by card and is now at Stage 2 — Confirmed. The money went straight to the NGO's Stripe account.`
        : "Your card payment went through.",
    },
    failed: {
      icon: "↩️",
      title: canceled === "1" ? "Payment cancelled" : "Payment not completed",
      text: "Your card was not charged. You can donate again from your dashboard whenever you like.",
    },
    pending: {
      icon: "⏳",
      title: "Payment still processing",
      text: "Stripe hasn't confirmed the payment yet. Your dashboard will update as soon as it does.",
    },
    error: {
      icon: "⚠️",
      title: "Couldn't confirm the payment",
      text: errorMsg,
    },
  };
  const view = views[status] || views.checking;

  return (
    <>
      <Head>
        <title>Donation · DonateLink</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center animate-page-in">
          <div className="text-4xl">{view.icon}</div>
          <h1 className="mt-4 text-xl font-bold text-zinc-900">{view.title}</h1>
          <p className="mt-2 text-sm text-zinc-600">{view.text}</p>
          {status !== "checking" && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {status === "paid" && donation && (
                <Link
                  href={`/donor/track/${donation.id}`}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Track donation
                </Link>
              )}
              <Link
                href="/donor/dashboard"
                className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:border-zinc-400"
              >
                Back to dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
