import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — EdoSUBEB Smart Attendance" },
      {
        name: "description",
        content:
          "Terms and Conditions governing use of the EdoSUBEB Smart Attendance application.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link to="/cookies" className="text-muted-foreground hover:text-foreground">Cookies</Link>
            <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <article className="prose prose-sm sm:prose-base max-w-none text-foreground">
          <h1 className="text-3xl font-bold tracking-tight">Terms & Conditions</h1>
          <p className="text-sm text-muted-foreground">Last updated: {updated}</p>

          <p>
            These Terms and Conditions ("Terms") govern your use of the EdoSUBEB Smart
            Attendance application and related services (collectively, the "App") provided
            by the Edo State Universal Basic Education Board ("EdoSUBEB", "we", "us"). By
            creating an account or otherwise using the App, you agree to be bound by these
            Terms.
          </p>

          <h2 className="mt-6 text-xl font-semibold">1. Eligibility & Accounts</h2>
          <p>
            The App is provided for use by serving teachers, head teachers, and
            administrators of Edo State public primary schools, and authorised EdoSUBEB
            personnel. You must be at least 18 years old and provide accurate registration
            information. You are responsible for keeping your password and Teacher ID
            confidential and for all activity under your account.
          </p>

          <h2 className="mt-6 text-xl font-semibold">2. Acceptable Use</h2>
          <p>You agree NOT to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Mark attendance for any person other than yourself.</li>
            <li>Use mock-location, GPS spoofing, or any tool to falsify your position.</li>
            <li>Share your account credentials with any other person.</li>
            <li>Attempt to bypass authentication, role permissions, or security controls.</li>
            <li>Upload unlawful, harmful, or misleading content.</li>
            <li>Interfere with the operation, integrity, or security of the App.</li>
            <li>Use the App for any purpose other than its intended educational administration role.</li>
          </ul>
          <p>
            Violation may result in suspension or termination of your account and, where
            applicable, disciplinary or legal action.
          </p>

          <h2 className="mt-6 text-xl font-semibold">3. Location Services</h2>
          <p>
            The App requires access to your device's GPS to verify that attendance is marked
            at your assigned school. By using the attendance feature, you consent to the
            collection and processing of your location at the moment of check-in, as
            described in our <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>

          <h2 className="mt-6 text-xl font-semibold">4. Attendance Records</h2>
          <p>
            Attendance records, including timestamps, lateness flags, and GPS coordinates,
            are official records of EdoSUBEB. They may be used for payroll, performance
            review, statistical reporting, and administrative decisions. You acknowledge
            that knowingly submitting false attendance information may constitute misconduct
            under public-service rules.
          </p>

          <h2 className="mt-6 text-xl font-semibold">5. Intellectual Property</h2>
          <p>
            All content, software, trademarks, logos, and designs in the App are owned by
            or licensed to EdoSUBEB and are protected by applicable intellectual-property
            laws. You are granted a limited, revocable, non-transferable, non-exclusive
            licence to use the App solely for its intended purpose.
          </p>

          <h2 className="mt-6 text-xl font-semibold">6. User-Generated Content</h2>
          <p>
            By submitting information through the App (e.g. profile details, attendance
            entries, notes), you grant EdoSUBEB a perpetual, royalty-free licence to use
            such information for the operation, administration, and improvement of basic
            education in Edo State.
          </p>

          <h2 className="mt-6 text-xl font-semibold">7. Service Availability</h2>
          <p>
            We aim to keep the App available at all times but do not guarantee uninterrupted
            access. We may modify, suspend, or discontinue any feature without prior notice.
            Scheduled maintenance and emergency fixes may temporarily affect availability.
          </p>

          <h2 className="mt-6 text-xl font-semibold">8. Third-Party Platforms</h2>
          <p>
            If you obtained the App from the Apple App Store or Google Play Store, your use
            is also subject to that platform's terms. Apple Inc. and Google LLC are not
            responsible for the App or its content, and are not parties to these Terms,
            although they are third-party beneficiaries entitled to enforce these Terms
            against you with respect to your use of the App on their platforms.
          </p>

          <h2 className="mt-6 text-xl font-semibold">9. Disclaimers</h2>
          <p>
            The App is provided "as is" and "as available" without warranties of any kind,
            express or implied, including merchantability, fitness for a particular purpose,
            or non-infringement. We do not warrant that the App will be error-free or that
            GPS accuracy will be perfect in all environments.
          </p>

          <h2 className="mt-6 text-xl font-semibold">10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, EdoSUBEB, its officers, employees, and
            service providers shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, or any loss of data, profits, or goodwill,
            arising out of or in connection with your use of the App.
          </p>

          <h2 className="mt-6 text-xl font-semibold">11. Indemnity</h2>
          <p>
            You agree to indemnify and hold harmless EdoSUBEB and its personnel from any
            claims, damages, liabilities, and expenses arising from your breach of these
            Terms or misuse of the App.
          </p>

          <h2 className="mt-6 text-xl font-semibold">12. Termination</h2>
          <p>
            We may suspend or terminate your access to the App at any time for breach of
            these Terms or where required by EdoSUBEB policy. You may delete your account
            at any time from Settings → My Profile.
          </p>

          <h2 className="mt-6 text-xl font-semibold">13. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the Federal Republic of Nigeria. Any
            dispute shall be subject to the exclusive jurisdiction of the courts of Edo
            State.
          </p>

          <h2 className="mt-6 text-xl font-semibold">14. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the App after a
            change constitutes acceptance of the revised Terms.
          </p>

          <h2 className="mt-6 text-xl font-semibold">15. Contact</h2>
          <p>
            For questions about these Terms, contact:{" "}
            <a href="mailto:support@edosubeb.gov.ng">support@edosubeb.gov.ng</a>, Edo State
            Universal Basic Education Board, Benin City, Edo State, Nigeria.
          </p>
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
