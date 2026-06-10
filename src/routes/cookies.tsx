import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies Policy — EdoSUBEB Smart Attendance" },
      {
        name: "description",
        content:
          "Cookies Policy for the EdoSUBEB Smart Attendance application: what cookies we use and how you can manage them.",
      },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
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
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
            <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <article className="prose prose-sm sm:prose-base max-w-none text-foreground">
          <h1 className="text-3xl font-bold tracking-tight">Cookies Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {updated}</p>

          <p>
            This Cookies Policy explains how the EdoSUBEB Smart Attendance application ("the App",
            "we", "us", or "our") uses cookies and similar technologies. By using the App, you
            consent to the use of cookies as described in this policy.
          </p>

          <h2 className="mt-6 text-xl font-semibold">1. What Are Cookies?</h2>
          <p>
            Cookies are small text files that are stored on your device (computer, tablet, or mobile)
            when you visit a website or use a web application. They are widely used to make applications
            work more efficiently, as well as to provide information to the application owners.
          </p>

          <h2 className="mt-6 text-xl font-semibold">2. How We Use Cookies</h2>
          <p>We use cookies for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Essential cookies:</strong> These cookies are necessary for the App to function
              properly. They enable core features such as authentication, security, and session management.
              Without these cookies, the App cannot operate correctly.
            </li>
            <li>
              <strong>Performance cookies:</strong> These cookies help us understand how visitors interact
              with the App by collecting and reporting information anonymously. This helps us improve the
              App's performance and user experience.
            </li>
            <li>
              <strong>Functionality cookies:</strong> These cookies allow the App to remember choices you
              make (such as your language preference or display settings) and provide enhanced, more
              personalised features.
            </li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold">3. Types of Cookies We Use</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Session cookies:</strong> These are temporary cookies that expire when you close your
              browser or log out of the App. They are used to maintain your session and authentication
              state during your visit.
            </li>
            <li>
              <strong>Persistent cookies:</strong> These cookies remain on your device for a set period of
              time or until you manually delete them. They are used to remember your preferences and
              settings across multiple sessions.
            </li>
            <li>
              <strong>First-party cookies:</strong> These are set by the App itself and can only be read by
              the App.
            </li>
            <li>
              <strong>Third-party cookies:</strong> These may be set by our service providers (such as
              authentication and hosting providers) to support the functionality of the App.
            </li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold">4. Specific Cookies Used</h2>
          <p>The following cookies and similar technologies are used in the App:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Authentication tokens:</strong> Used to keep you signed in securely while using the
              App. These are typically session-based or short-lived persistent cookies.
            </li>
            <li>
              <strong>Preference cookies:</strong> Used to remember your display preferences, language
              settings, and other customisations.
            </li>
            <li>
              <strong>Analytics cookies:</strong> Used to collect anonymous usage data to help us improve
              the App. This includes information about which features are used most and how users navigate
              the App.
            </li>
          </ul>

          <h2 className="mt-6 text-xl font-semibold">5. Managing Cookies</h2>
          <p>
            Most web browsers allow you to manage cookies through their settings. You can typically:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>View cookies stored on your device and delete them individually or all at once.</li>
            <li>Block cookies from particular websites or all websites.</li>
            <li>Block third-party cookies while allowing first-party cookies.</li>
            <li>Delete all cookies when you close your browser.</li>
          </ul>
          <p className="mt-2">
            Please note that if you disable or delete cookies, some features of the App may not function
            correctly. In particular, disabling essential cookies will prevent you from logging in or using
            core App features.
          </p>

          <h2 className="mt-6 text-xl font-semibold">6. Mobile App Cookies</h2>
          <p>
            When using the EdoSAS mobile application (available on Apple App Store and Google Play Store),
            similar technologies such as local storage and secure tokens may be used to maintain your
            session and preferences. These are governed by the same principles as browser cookies.
          </p>

          <h2 className="mt-6 text-xl font-semibold">7. Third-Party Services</h2>
          <p>
            The App may use third-party services that set their own cookies. These providers are bound by
            their own cookie policies and data-processing agreements. We do not control the cookies set by
            these third parties, and we encourage you to review their respective cookie policies.
          </p>

          <h2 className="mt-6 text-xl font-semibold">8. Changes to This Policy</h2>
          <p>
            We may update this Cookies Policy from time to time to reflect changes in technology, law, or
            our data practices. Material changes will be communicated in-app and the "Last updated" date
            will be revised.
          </p>

          <h2 className="mt-6 text-xl font-semibold">9. Contact Us</h2>
          <p>
            If you have any questions about our use of cookies or this Cookies Policy, please contact:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email: <a href="mailto:support@edosubeb.gov.ng">support@edosubeb.gov.ng</a></li>
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
