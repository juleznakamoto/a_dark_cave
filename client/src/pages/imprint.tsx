
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Imprint() {
  return (
    <div className="min-h-screen w-full bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* German Version */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Impressum</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <h3>Angaben gemäß § 5 TMG</h3>
            <p>
              <strong>[Your Full Name or Company Name]</strong><br />
              [Your Street and House Number]<br />
              [Your Postal Code and City]<br />
              Deutschland
            </p>

            <h4>Vertreten durch:</h4>
            <p>[Your Full Name, if you are the sole owner]</p>

            <h4>Kontakt:</h4>
            <p>E-Mail: [Your Support Email Address]</p>

            <h4>Umsatzsteuer-ID:</h4>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
              [Your VAT ID, if applicable]
            </p>

            <h4>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:</h4>
            <p>
              [Your Full Name]<br />
              [Your Street and House Number]<br />
              [Your Postal Code and City]
            </p>

            <h4>Streitschlichtung:</h4>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
                https://ec.europa.eu/consumers/odr
              </a>
              .<br />
              Unsere E-Mail-Adresse finden Sie oben im Impressum.<br />
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </CardContent>
        </Card>

        {/* English Version */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Legal Notice</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <h3>Information pursuant to § 5 TMG (German Telemedia Act)</h3>
            <p>
              <strong>[Your Full Name or Company Name]</strong><br />
              [Your Street and House Number]<br />
              [Your Postal Code and City]<br />
              Germany
            </p>

            <h4>Represented by:</h4>
            <p>[Your Full Name, if you are the sole owner]</p>

            <h4>Contact:</h4>
            <p>Email: [Your Support Email Address]</p>

            <h4>VAT ID:</h4>
            <p>
              Value Added Tax Identification Number pursuant to § 27 a of the German Value Added Tax Act:<br />
              [Your VAT ID, if applicable]
            </p>

            <h4>Responsible for content pursuant to § 55 para. 2 RStV (German Interstate Broadcasting Treaty):</h4>
            <p>
              [Your Full Name]<br />
              [Your Street and House Number]<br />
              [Your Postal Code and City]
            </p>

            <h4>Dispute Resolution:</h4>
            <p>
              The European Commission provides a platform for online dispute resolution (OS):{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
                https://ec.europa.eu/consumers/odr
              </a>
              .<br />
              You can find our email address in the legal notice above.<br />
              We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
