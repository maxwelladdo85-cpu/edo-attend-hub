import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — EdoSUBEB Smart Attendance" },
      {
        name: "description",
        content:
          "Privacy Policy for the EdoSUBEB Smart Attendance application: what data we collect, how we use it, and your rights.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const updated = "June 10, 2026";
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <div className="leading-tight">
              <div className="font-display font-bold text-xl text-foreground">EdoSUBEB</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Smart Attendance</div>
            </div>
          </Link>
          <nav className="text-sm flex gap-4">
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
            <Link to="/cookies" className="text-muted-foreground hover:text-foreground">Cookies</Link>
            <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <article className="prose prose-sm sm:prose-base max-w-none text-foreground">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {updated}</p>

          <p>
            The EdoSUBEB Smart Attendance application ("the App", "we", "us", or "our") is
            operated by the Edo State Universal Basic Education Board ("EdoSUBEB"). This
            Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you use the App on any platform, including the Apple App Store
            and Google Play Store.
          </p>

          <h2 className="mt-6 text-xl font-semibold">1. Information We Collect</h2>
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Account information:</strong> full name, email address, phone number,
              Oracle ID, role (Teacher, Head Teacher, Administrator), and the school /
              Local Government Area you are assigned to.
            </li>
            <li>
              <strong>Authentication data:</strong> encrypted passwords, sign-in timestamps,
              and session tokens managed by our authentication provider.
            </li>
            <li>
              <strong>Location (GPS) data:</strong> precise latitude and longitude captured
              <em> only at the moment you tap "Mark Attendance"</em>. We do not track your
              location in the background.
            </li>
            <li>
              <strong>Attendance records:</strong> arrival and departure times, lateness or
              early-departure flags, and the calculated distance between your check-in
              location and your assigned school.
            </li>
            <li>
              <strong>Device & diagnostic data:</strong> device type, operating system
              version, app version, IP address, and crash logs used to keep the App stable
              and secure.
            </li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Verify that attendance is marked on-site at the assigned school.</li>
            <li>Provide Head Teachers and Administrators with attendance dashboards.</li>
            <li>Generate statewide reports for EdoSUBEB planning and policy.</li>
            <li>Authenticate users and secure their accounts.</li>
            <li>Diagnose technical issues and improve the App.</li>
            <li>Comply with legal and regulatory obligations.</li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold">3. Location Data — Important Notice</h2>
          <p>
            The App requests access to your device's location <strong>only while the App is
            in use</strong>. Location is captured exclusively at the moment of marking
            attendance and is stored together with the attendance record. We do not sell,
            share, or use location data for advertising. You may revoke location permission
            at any time in your device settings, but doing so will prevent you from marking
            GPS-verified attendance.
          </p>

          <h2 className="mt-6 text-xl font-semibold">4. Legal Basis for Processing</h2>
          <p>
            We process your personal data on the basis of (a) your consent, (b) performance
            of our public-interest task as the state basic education authority, and (c)
            compliance with applicable Nigerian law, including the Nigeria Data Protection
            Act, 2023.
          </p>

          <h2 className="mt-6 text-xl font-semibold">5. Sharing & Disclosure</h2>
          <p>We do not sell your personal information. We share data only with:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Authorised EdoSUBEB officials and your school's Head Teacher.</li>
            <li>
              Service providers who host our database, authentication, and infrastructure
              under strict confidentiality and data-processing agreements.
            </li>
            <li>Law-enforcement or regulators when required by valid legal process.</li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold">6. Data Retention</h2>
          <p>
            Attendance records are retained for as long as required for educational
            administration and statutory record-keeping. Account data is retained while your
            account is active and deleted (or anonymised) within 90 days of account
            deletion, except where law requires longer retention.
          </p>

          <h2 className="mt-6 text-xl font-semibold">7. Security</h2>
          <p>
            We protect your information using industry-standard measures including TLS in
            transit, encryption at rest, role-based access control, and row-level security
            on our database. No method of transmission over the Internet is 100% secure, but
            we work continuously to safeguard your data.
          </p>

          <h2 className="mt-6 text-xl font-semibold">8. Children's Privacy</h2>
          <p>
            The App is intended for use by adults (teachers, head teachers, administrators).
            Student-level attendance is recorded by their teacher and contains only
            attendance status — no biometrics, photos, or location of the child. We do not
            knowingly collect personal information directly from children under 13.
          </p>

          <h2 className="mt-6 text-xl font-semibold">9. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account (available in Settings → My Profile).</li>
            <li>Withdraw consent for optional processing.</li>
            <li>Lodge a complaint with the Nigeria Data Protection Commission.</li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold">10. Third-Party Services</h2>
          <p>
            The App relies on third-party infrastructure providers (database, authentication,
            hosting). These providers process data on our behalf under contractual
            safeguards and are not permitted to use your data for their own purposes.
          </p>

          <h2 className="mt-6 text-xl font-semibold">11. International Transfers</h2>
          <p>
            Some of our service providers may store data outside Nigeria. Where this occurs,
            we ensure appropriate safeguards are in place in line with the Nigeria Data
            Protection Act, 2023.
          </p>

          <h2 className="mt-6 text-xl font-semibold">12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            communicated in-app and the "Last updated" date will be revised.
          </p>

          <h2 className="mt-6 text-xl font-semibold">13. Contact Us</h2>
          <p>
            For privacy questions or to exercise your rights, contact the EdoSUBEB Data
            Protection Officer:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email: <a href="mailto:privacy@edosubeb.gov.ng">privacy@edosubeb.gov.ng</a></li>
            <li>Address: Edo State Universal Basic Education Board, Benin City, Edo State, Nigeria.</li>
          </ul>
        </article>
      </main>

      <footer className="border-t border-border/60 py-8 mt-8">
        <div className="container mx-auto px-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Edo State Universal Basic Education Board</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
