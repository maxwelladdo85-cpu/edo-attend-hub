import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — EdoSUBEB Smart Attendance" },
      { name: "description", content: "Terms governing the use of the EdoSUBEB Smart Attendance System by teachers, head teachers, and administrators." },
      { property: "og:title", content: "Terms of Service — EdoSUBEB Smart Attendance" },
      { property: "og:description", content: "Acceptable use, account responsibilities, and governing law for the EdoSUBEB Smart Attendance System." },
      { property: "og:url", content: "https://edosas.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://edosas.com/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="June 9, 2026">
      <p>
        These Terms govern your access to and use of the EdoSUBEB Smart Attendance
        System (the "Service"). By creating an account or signing in, you agree to
        these Terms.
      </p>

      <h2>1. Eligibility and accounts</h2>
      <p>
        The Service is provided to teachers, head teachers, and administrators
        engaged by Edo State public primary and junior secondary schools. You must
        provide accurate information when creating your account and keep your login
        credentials confidential. You are responsible for all activity carried out
        under your account.
      </p>

      <h2>2. Acceptable use</h2>
      <ul>
        <li>Use the Service only for its intended purpose — marking, verifying, and reviewing attendance.</li>
        <li>Do not mark attendance on behalf of another person or falsify location data.</li>
        <li>Do not attempt to reverse-engineer, scrape, or disrupt the Service.</li>
        <li>Do not upload unlawful, harmful, or infringing content.</li>
      </ul>

      <h2>3. Ownership</h2>
      <p>
        The Service, including its software, design, and content, is owned by
        EdoSUBEB and its licensors. Attendance records belong to EdoSUBEB as the
        education authority of record.
      </p>

      <h2>4. Suspension and termination</h2>
      <p>
        We may suspend or terminate access for breach of these Terms, for security
        reasons, or where required by your employment status. You may request
        deletion of your account at any time.
      </p>

      <h2>5. Disclaimers</h2>
      <p>
        The Service is provided "as is". To the maximum extent permitted by law,
        EdoSUBEB makes no warranties regarding uninterrupted availability or
        fitness for any particular purpose beyond attendance administration.
      </p>

      <h2>6. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, EdoSUBEB shall not be liable for
        any indirect, incidental, or consequential damages arising from your use of
        the Service.
      </p>

      <h2>7. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Federal Republic of Nigeria,
        with disputes subject to the exclusive jurisdiction of the courts of Edo
        State.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about these Terms? Email{" "}
        <a href="mailto:support@edosubeb.gov.ng" className="text-primary underline">support@edosubeb.gov.ng</a>.
      </p>
    </LegalPage>
  );
}
