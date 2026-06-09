import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — EdoSUBEB Smart Attendance" },
      { name: "description", content: "Get help with the EdoSUBEB Smart Attendance System — contact support, report issues, or request account changes." },
      { property: "og:title", content: "Support — EdoSUBEB Smart Attendance" },
      { property: "og:description", content: "Contact EdoSUBEB support for help with the Smart Attendance System." },
      { property: "og:url", content: "https://edosas.com/support" },
    ],
    links: [{ rel: "canonical", href: "https://edosas.com/support" }],
  }),
  component: Support,
});

function Support() {
  return (
    <LegalPage title="Support" updated="June 9, 2026">
      <p>
        We're here to help teachers, head teachers, and administrators get the
        most out of the EdoSUBEB Smart Attendance System.
      </p>

      <h2>Contact us</h2>
      <ul>
        <li>
          <strong>General support</strong>:{" "}
          <a href="mailto:support@edosubeb.gov.ng" className="text-primary underline">support@edosubeb.gov.ng</a>
        </li>
        <li>
          <strong>Privacy & data requests</strong>:{" "}
          <a href="mailto:privacy@edosubeb.gov.ng" className="text-primary underline">privacy@edosubeb.gov.ng</a>
        </li>
        <li>
          <strong>Phone</strong>: +234 (0) 800 EDO SUBEB (Mon–Fri, 9am–4pm WAT)
        </li>
        <li>
          <strong>Office</strong>: EdoSUBEB Secretariat, Sapele Road, Benin City, Edo State, Nigeria
        </li>
      </ul>

      <h2>Common issues</h2>
      <ul>
        <li>
          <strong>Can't sign in?</strong> Check that your Teacher ID and password
          are correct. If you're locked out, ask your head teacher or school admin
          to reset your account.
        </li>
        <li>
          <strong>Location not detected?</strong> Make sure location services are
          turned on for your browser or the EdoSUBEB app, and that you are on the
          school premises.
        </li>
        <li>
          <strong>Wrong school assigned?</strong> Email support with your full
          name, Teacher ID, and the correct school.
        </li>
      </ul>

      <h2>Response time</h2>
      <p>
        We aim to acknowledge support requests within one (1) working day and
        resolve most issues within three (3) working days.
      </p>
    </LegalPage>
  );
}
