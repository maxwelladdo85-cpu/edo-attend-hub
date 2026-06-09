import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — EdoSUBEB Smart Attendance" },
      { name: "description", content: "How EdoSUBEB Smart Attendance collects, uses, stores, and protects personal data of teachers, head teachers, administrators, and students." },
      { property: "og:title", content: "Privacy Policy — EdoSUBEB Smart Attendance" },
      { property: "og:description", content: "Our commitment to data protection under the Nigeria Data Protection Act and applicable international standards." },
      { property: "og:url", content: "https://edosas.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://edosas.com/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="June 9, 2026">
      <p>
        The Edo State Universal Basic Education Board ("EdoSUBEB", "we", "our") operates the
        EdoSUBEB Smart Attendance System (the "Service") to digitally record and verify
        attendance of teachers, head teachers, administrators, and students across Edo State
        public primary and junior secondary schools. This policy explains what personal
        information we collect, why we collect it, how we use it, and your rights.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account information</strong>: full name, role, email address, phone number, Teacher/Head Teacher ID, assigned school, and class taught (for teachers).</li>
        <li><strong>Authentication data</strong>: hashed password and session tokens managed by our backend provider.</li>
        <li><strong>Attendance records</strong>: arrival and departure timestamps, head-teacher verification, and the names of students you mark present or absent.</li>
        <li><strong>Location data</strong>: your device's GPS coordinates at the moment you mark attendance. We use this only to verify that you are physically at your assigned school. We do not track your location at any other time.</li>
        <li><strong>Device information</strong>: browser/OS user agent and IP address, used for security audit logging.</li>
      </ul>

      <h2>2. Why we collect it (lawful basis)</h2>
      <p>
        Processing is carried out in the performance of a task in the public interest
        (statewide basic-education administration) and under the legitimate interests
        of EdoSUBEB to ensure teacher punctuality and student attendance. For optional
        data (e.g. phone number), we rely on your consent, which you may withdraw at
        any time.
      </p>

      <h2>3. How long we keep it</h2>
      <p>
        Attendance records and security audit logs are retained for up to seven (7)
        years to satisfy public-sector record-keeping obligations. Account data is
        kept while your account is active and for 12 months after deactivation, then
        anonymised or deleted.
      </p>

      <h2>4. Who we share it with</h2>
      <ul>
        <li><strong>EdoSUBEB administrators and your school's head teacher</strong>, who need access to perform supervisory duties.</li>
        <li><strong>Our infrastructure providers</strong> (Lovable Cloud, which uses Supabase as its underlying database and authentication platform). They process data on our behalf under contract and are not permitted to use it for any other purpose.</li>
        <li><strong>Government regulators or law enforcement</strong>, only where required by Nigerian law.</li>
      </ul>
      <p>We do not sell personal data, and we do not use it for advertising.</p>

      <h2>5. Children's data</h2>
      <p>
        Student names, classes, and attendance status are recorded by authorised
        school staff — not by children directly. The Service is not designed for use
        by children under 13, and we do not knowingly collect personal data from
        children outside of attendance records entered by their teachers.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Under the Nigeria Data Protection Act 2023 (and, where applicable, the GDPR
        and CCPA), you have the right to access, correct, delete, or restrict
        processing of your personal data, and to lodge a complaint with a
        supervisory authority. To exercise these rights, see our{" "}
        <Link to="/data-deletion" className="text-primary underline">Data Deletion</Link> page
        or contact us using the details below.
      </p>

      <h2>7. Security</h2>
      <p>
        Data is transmitted over HTTPS and stored with row-level security policies
        that restrict access to authorised users. Passwords are salted and hashed.
        We maintain audit logs of administrative actions.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>We will post updates here and revise the "Last updated" date above.</p>

      <h2>9. Contact</h2>
      <p>
        EdoSUBEB, Sapele Road, Benin City, Edo State, Nigeria. <br />
        Email: <a href="mailto:privacy@edosubeb.gov.ng" className="text-primary underline">privacy@edosubeb.gov.ng</a>
      </p>
    </LegalPage>
  );
}
