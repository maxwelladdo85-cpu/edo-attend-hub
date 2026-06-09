import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/data-deletion")({
  head: () => ({
    meta: [
      { title: "Data Deletion — EdoSUBEB Smart Attendance" },
      { name: "description", content: "How to request deletion of your EdoSUBEB Smart Attendance account and personal data." },
      { property: "og:title", content: "Data Deletion — EdoSUBEB Smart Attendance" },
      { property: "og:description", content: "Request account and data deletion from the EdoSUBEB Smart Attendance System." },
      { property: "og:url", content: "https://edosas.com/data-deletion" },
    ],
    links: [{ rel: "canonical", href: "https://edosas.com/data-deletion" }],
  }),
  component: DataDeletion,
});

function DataDeletion() {
  return (
    <LegalPage title="Data Deletion Request" updated="June 9, 2026">
      <p>
        You can request deletion of your EdoSUBEB Smart Attendance account and the
        personal data associated with it at any time.
      </p>

      <h2>How to submit a request</h2>
      <ol>
        <li>
          Send an email to{" "}
          <a href="mailto:privacy@edosubeb.gov.ng" className="text-primary underline">privacy@edosubeb.gov.ng</a>{" "}
          from the email address registered to your account.
        </li>
        <li>Use the subject line: <em>"Data Deletion Request"</em>.</li>
        <li>Include your full name, role, Teacher/Head Teacher ID (if applicable), and assigned school.</li>
      </ol>

      <h2>What we delete</h2>
      <ul>
        <li>Your account profile (name, contact details, role assignment).</li>
        <li>Authentication credentials.</li>
        <li>Personal preferences stored on our servers.</li>
      </ul>

      <h2>What we retain</h2>
      <p>
        For up to seven (7) years, we retain the following in anonymised or
        pseudonymised form to satisfy public-sector record-keeping obligations:
      </p>
      <ul>
        <li>Aggregate attendance statistics (without identifying you personally).</li>
        <li>Security audit log entries required for fraud and integrity investigations.</li>
        <li>Records linked to ongoing administrative or legal proceedings.</li>
      </ul>

      <h2>Timeline</h2>
      <p>
        We will acknowledge your request within 7 working days and complete
        deletion within 30 days, subject to verification of your identity.
      </p>
    </LegalPage>
  );
}
