
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Privacy() {
  return (
    <ScrollArea className="h-screen w-full bg-black">
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-3xl text-white">Privacy Policy</CardTitle>
            <p className="text-sm text-gray-400">Last Updated: [Date of last update]</p>
          </CardHeader>
          <CardContent className="prose prose-sm prose-invert max-w-none text-white">
            <h3>1. General Information</h3>
            <p>
              This Privacy Policy informs you about the nature, scope, and purpose of the processing of personal data (hereinafter "data") within our online game "A Dark Cave" and its associated websites, functions, and content.
            </p>
            <p>
              <strong>Data Controller:</strong><br />
              [Your Full Name or Company Name]<br />
              [Your Street and House Number]<br />
              [Your Postal Code and City]<br />
              Email: [Your Support Email Address]
            </p>

            <h3>2. Your Rights as a Data Subject</h3>
            <p>You have the right:</p>
            <ul>
              <li>to request information about your personal data processed by us in accordance with Art. 15 GDPR.</li>
              <li>to demand the immediate correction of incorrect or incomplete personal data stored by us in accordance with Art. 16 GDPR.</li>
              <li>to request the deletion of your personal data stored by us in accordance with Art. 17 GDPR, unless the processing is necessary for exercising the right to freedom of expression and information, for fulfilling a legal obligation, for reasons of public interest, or for asserting, exercising, or defending legal claims.</li>
              <li>to demand the restriction of the processing of your personal data in accordance with Art. 18 GDPR.</li>
              <li>to receive your personal data that you have provided to us in a structured, common, and machine-readable format or to request its transfer to another controller in accordance with Art. 20 GDPR.</li>
              <li>to revoke your consent given to us at any time in accordance with Art. 7 (3) GDPR. This means that we may no longer continue the data processing based on this consent in the future.</li>
              <li>to complain to a supervisory authority in accordance with Art. 77 GDPR.</li>
            </ul>

            <h3>3. Data Processing Details</h3>
            
            <h4>a) When visiting the website:</h4>
            <p>
              When you access our website, our server automatically stores information in server log files that your browser transmits. These are: browser type/version, operating system used, referrer URL, hostname of the accessing computer, and time of the server request. This data is not merged with other data sources. The basis for this data processing is Art. 6(1)(f) GDPR, our legitimate interest in the technically flawless presentation and security of our website.
            </p>

            <h4>b) Account Creation (Cloud Save):</h4>
            <p>
              If you choose to create an account, we collect your email address and a password hash. This data is necessary to create and manage your account and to provide the cloud save functionality. The legal basis is Art. 6(1)(b) GDPR (performance of a contract).
            </p>

            <h4>c) Game State Storage:</h4>
            <p>
              For authenticated users, your complete game state is stored in our database to allow you to continue your game across different devices. This is a core function of the service. The legal basis is Art. 6(1)(b) GDPR (performance of a contract).
            </p>

            <h4>d) In-Game Purchases:</h4>
            <p>
              When you make a purchase, we store a record of the transaction (user ID, item, price, timestamp). This is necessary for contract fulfillment and for support purposes. We do not store any financial data like credit card numbers. The legal basis is Art. 6(1)(b) GDPR (performance of a contract).
            </p>

            <h3>4. Cookies and Local Storage</h3>
            <p>
              We use session storage on your device to maintain your authentication state. This is a technically necessary function. The legal basis is § 25(2) No. 2 TDDDG.
            </p>
            <p>
              For users playing without an account, we use IndexedDB in your browser to save your game progress locally. This is essential for the game's functionality. The legal basis is § 25(2) No. 2 TDDDG.
            </p>
            <p>We do not use any tracking, analytics, or marketing cookies.</p>

            <h3>5. Third-Party Services</h3>
            <p>
              We use third-party services to provide and improve our Game. We have concluded Data Processing Addendums (DPAs) with these providers where required.
            </p>

            <h4>a) Supabase:</h4>
            <p>
              We use Supabase Inc. (USA) for our backend infrastructure, including authentication and database hosting. Supabase processes your email address, password hash, and game data on our behalf. We have configured our Supabase project to store all data within the EU (Frankfurt region). The legal basis for this is Art. 6(1)(b) and Art. 6(1)(f) GDPR. We have entered into a DPA with Supabase to ensure that your data is handled in compliance with the GDPR.
            </p>

            <h4>b) Stripe:</h4>
            <p>
              For processing payments, we use Stripe Payments Europe, Ltd. (Ireland). When you make a purchase, you are redirected to Stripe's payment interface. Stripe collects payment information (e.g., credit card details) directly. We do not receive or store this sensitive financial data. Stripe is responsible for the secure processing of your payment data. The legal basis for using Stripe is Art. 6(1)(b) GDPR (performance of a contract).
            </p>

            <h3>6. Data Retention</h3>
            <p>We store your data for the following periods:</p>
            <ul>
              <li><strong>Account Data & Game Saves:</strong> Indefinitely, until you delete your account. Upon account deletion, all associated data is permanently removed.</li>
              <li><strong>Purchase History:</strong> For legal and accounting reasons, we are required to retain purchase data for up to 10 years (according to German commercial and tax law).</li>
            </ul>

            <h3>7. Data Security</h3>
            <p>
              We take appropriate technical and organizational measures to protect your data from unauthorized access, loss, or alteration. Communication with our servers is encrypted via SSL/TLS.
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
