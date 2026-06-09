import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — EdoSUBEB Smart Attendance" },
      { name: "description", content: "How EdoSUBEB Smart Attendance uses cookies and similar storage — essential cookies only, no advertising or third-party tracking." },
      { property: "og:title", content: "Cookie Policy — EdoSUBEB Smart Attendance" },
      { property: "og:description", content: "Essential cookies only. No advertising or cross-site tracking." },
      { property: "og:url", content: "https://edosas.com/cookies" },
    ],
    links: [{ rel: "canonical", href: "https://edosas.com/cookies" }],
  }),
  component: Cookies,
});

function Cookies() {
  return (
    <LegalPage title="Cookie Policy" updated="June 9, 2026">
      <p>
        This page explains how the EdoSUBEB Smart Attendance System uses cookies
        and similar browser storage.
      </p>

      <h2>1. What we use</h2>
      <p>We use only <strong>essential</strong> cookies and local storage. These are required to:</p>
      <ul>
        <li>Keep you signed in across pages (authentication session tokens).</li>
        <li>Remember your role and dashboard preferences on this device.</li>
        <li>Remember that you acknowledged this notice so we don't show it again.</li>
      </ul>

      <h2>2. What we do not use</h2>
      <ul>
        <li>No advertising cookies.</li>
        <li>No third-party analytics that profile individual users.</li>
        <li>No cross-site tracking pixels.</li>
      </ul>

      <h2>3. Managing cookies</h2>
      <p>
        Because the only cookies we set are essential to operating the Service,
        disabling them in your browser will prevent you from signing in. You can
        clear them at any time from your browser settings.
      </p>

      <h2>4. Contact</h2>
      <p>
        Questions? Email{" "}
        <a href="mailto:privacy@edosubeb.gov.ng" className="text-primary underline">privacy@edosubeb.gov.ng</a>.
      </p>
    </LegalPage>
  );
}
