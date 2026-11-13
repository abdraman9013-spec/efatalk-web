import { LegalH, LegalP, LegalPage } from "@/components/legal/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="Last updated: 22 August 2026">
      <LegalP>
        English For All Academy (“EFA Talk”, “we”) operates https://www.efatalk.fyi. This page
        explains what we collect when you use our website and live English practice rooms.
      </LegalP>

      <LegalH>Who we are</LegalH>
      <LegalP>
        We are an online English academy. Contact us on WhatsApp at +36 70 726 0359 or by phone
        at +235 69 59 28 22.
      </LegalP>

      <LegalH>What we collect</LegalH>
      <LegalP>
        When you tap Enter the Academy and sign in with Google, Google shares your email address,
        first name, last name, and profile photo. We store these so we can place you in the right
        practice room. We do not ask you to type that information by hand.
      </LegalP>
      <LegalP>
        Official students who enter with a private academy code may also provide WhatsApp, city,
        nationality, and payment details that the academy already holds.
      </LegalP>
      <LegalP>
        During a live 2v2 or class session we process microphone audio (and camera only if a class
        uses video) so you can speak with other students. We also store practice points, diamonds,
        streaks, and lesson progress so the waiting room can show your results.
      </LegalP>

      <LegalH>Why we use it</LegalH>
      <LegalP>
        We use this data to create your student profile, keep you signed in, match you with a
        practice partner, run the September training and later classes, and contact you about
        lessons on WhatsApp or phone when needed.
      </LegalP>

      <LegalH>Who can see it</LegalH>
      <LegalP>
        Academy staff can see student profiles in the admin tools. Other students in a live room
        can see your display name, photo, country flag, and hear your voice. We use Google
        (sign-in), Supabase (database and login), Daily.co (live audio/video), and our hosting
        provider to run the site. We do not sell your data.
      </LegalP>

      <LegalH>How long we keep it</LegalH>
      <LegalP>
        We keep your profile while you are a student of the academy. If you ask us to delete your
        account, or if staff remove your student row, your login is closed and you must sign up
        again with Google to return.
      </LegalP>

      <LegalH>Your choices</LegalH>
      <LegalP>
        You can stop using the site at any time. You can revoke Google access in your Google
        account settings. Write or message us if you want your name, email, and practice record
        deleted.
      </LegalP>

      <LegalH>Children</LegalH>
      <LegalP>
        The academy is for learners who can create a Google account with a parent or guardian
        where local law requires it. We do not knowingly collect data from children without that
        care.
      </LegalP>

      <LegalH>Changes</LegalH>
      <LegalP>
        If this policy changes, we will update this page. The date at the top is the latest
        version.
      </LegalP>
    </LegalPage>
  );
}
