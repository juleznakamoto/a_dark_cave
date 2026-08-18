/** First-HTML bodies for legal routes and 404. English only.
 *  Keep in sync with client/src/pages/{privacy,terms,imprint,withdrawal,not-found}.tsx.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function h1(text: string): string {
  return `<h1>${escapeHtml(text)}</h1>`;
}

function h2(text: string): string {
  return `<h2>${escapeHtml(text)}</h2>`;
}

function h3(text: string): string {
  return `<h3>${escapeHtml(text)}</h3>`;
}

function p(text: string): string {
  return `<p>${escapeHtml(text)}</p>`;
}

function pHtml(html: string): string {
  return `<p>${html}</p>`;
}

function ul(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function ol(items: string[]): string {
  return `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function olHtml(items: string[]): string {
  return `<ol>${items.map((item) => `<li>${item}</li>`).join("")}</ol>`;
}

const CONTROLLER_BLOCK = [
  "<strong>Data Controller:</strong>",
  "Julian Bauer",
  "Königsberger Straße 1",
  "97072 Deutschland",
  'Email: <a href="mailto:support@a-dark-cave.com">support@a-dark-cave.com</a>',
].join("<br />");

const ADDRESS_BLOCK = [
  "Julian Bauer",
  "Königsberger Straße 1",
  "97072 Deutschland",
  'Email: <a href="mailto:support@a-dark-cave.com">support@a-dark-cave.com</a>',
].join("<br />");

function privacyBodyInnerHtml(): string {
  return [
    h1("Privacy Policy"),
    p("Last Updated: 31.07.2026"),
    h2("1. General Information"),
    p(
      'This Privacy Policy informs you about the nature, scope, and purpose of the processing of personal data (hereinafter "data") within our online game "A Dark Cave" and its associated websites, functions, and content.',
    ),
    pHtml(CONTROLLER_BLOCK),
    h2("2. Your Rights as a Data Subject"),
    p("You have the right:"),
    ul([
      "to request information about your personal data processed by us in accordance with Art. 15 GDPR.",
      "to demand the immediate correction of incorrect or incomplete personal data stored by us in accordance with Art. 16 GDPR.",
      "to request the deletion of your personal data stored by us in accordance with Art. 17 GDPR, unless the processing is necessary for exercising the right to freedom of expression and information, for fulfilling a legal obligation, for reasons of public interest, or for asserting, exercising, or defending legal claims.",
      "to demand the restriction of the processing of your personal data in accordance with Art. 18 GDPR.",
      "to receive your personal data that you have provided to us in a structured, common, and machine-readable format or to request its transfer to another controller in accordance with Art. 20 GDPR.",
      "to revoke your consent given to us at any time in accordance with Art. 7 (3) GDPR. This means that we may no longer continue the data processing based on this consent in the future.",
      "to complain to a supervisory authority in accordance with Art. 77 GDPR.",
    ]),
    h2("3. Data Processing Details"),
    h3("a) When visiting the website:"),
    p(
      "When you access our website, our server automatically stores information in server log files that your browser transmits. These are: browser type/version, operating system used, referrer URL, hostname of the accessing computer, and time of the server request. This data is not merged with other data sources. The basis for this data processing is Art. 6(1)(f) GDPR, our legitimate interest in the technically flawless presentation and security of our website.",
    ),
    h3("b) Account Creation (Cloud Save):"),
    p(
      "If you choose to create an account, we collect your email address and a password hash. This data is necessary to create and manage your account and to provide the cloud save functionality. The legal basis is Art. 6(1)(b) GDPR (performance of a contract).",
    ),
    h3("c) Game State Storage:"),
    p(
      "For authenticated users, your complete game state is stored in our database to allow you to continue your game across different devices. This may include progress, settings, play statistics, and related gameplay data. We may also store limited internal product analytics linked to your account (for example aggregated in-game button-click counts, and first-touch campaign or UTM parameters from the link you used to arrive, if any). The legal basis is Art. 6(1)(b) GDPR (performance of a contract) and, for limited analytics, Art. 6(1)(f) GDPR (legitimate interest in improving the game and measuring marketing effectiveness).",
    ),
    h3("d) Leaderboard:"),
    p(
      "If you complete the game, we may store a leaderboard entry linked to your account (for example play time, completion time, game mode, and email address used for the account). Public leaderboard displays use a username you choose or a masked form of your email, not your full email address. The legal basis is Art. 6(1)(b) GDPR (performance of a contract) and Art. 6(1)(f) GDPR (legitimate interest in operating the leaderboard).",
    ),
    h3("e) In-Game Purchases:"),
    p(
      "When you make a purchase, we store a record of the transaction (user ID, item, price, timestamp). This is necessary for contract fulfillment and for support purposes. We do not store any financial data like credit card numbers. The legal basis is Art. 6(1)(b) GDPR (performance of a contract).",
    ),
    h3("f) Optional marketing emails:"),
    pHtml(
      `${escapeHtml("We may send promotional emails (updates, discounts, rewards)")} <strong>${escapeHtml("only if you opt in")}</strong> ${escapeHtml("via a separate optional checkbox at sign-up or later in your profile. The legal basis is")} <strong>${escapeHtml("Art. 6(1)(a) GDPR (consent)")}</strong>. ${escapeHtml("You can withdraw consent at any time without affecting your account or cloud save: use the unsubscribe link in any marketing email, or use the subscribe / unsubscribe control in the in-game profile menu.")}`,
    ),
    p(
      "To demonstrate consent and withdrawals, we store a marketing preference record for your account, including: email (as provided), whether you opted in, how the choice was recorded (e.g. sign-up, Google sign-up, settings, or unsubscribe link), consent text and prompt version numbers, and timestamps for when you consented or withdrew. Unsubscribe links use a single-use token (we store only a cryptographic hash of the token until it is used or expires).",
    ),
    h3("g) Anonymous session and campaign metrics:"),
    p(
      "Independently of whether you create an account, we may store anonymous first-party product metrics: a random session identifier with approximate session duration, and (when you arrive via a campaign link) UTM or similar campaign parameters (for example source, medium, campaign). These records are not linked to your email or account. We retain them for about one year. The legal basis is Art. 6(1)(f) GDPR (legitimate interest in understanding how the game is used and which campaigns bring visitors).",
    ),
    h2("4. Cookies and Local Storage"),
    p(
      "We use session storage on your device to maintain your authentication state and for short-lived first-party session / campaign identifiers used for the anonymous metrics described in section 3g. This is a technically necessary function for operating and measuring the service. The legal basis is § 25(2) No. 2 TDDDG.",
    ),
    p(
      "For users playing without an account, we use IndexedDB in your browser to save your game progress locally. This is essential for the game's functionality. The legal basis is § 25(2) No. 2 TDDDG.",
    ),
    pHtml(
      `${escapeHtml("We do not use advertising or third-party tracking")} <em>${escapeHtml("cookies")}</em>. ${escapeHtml("We do use limited first-party product analytics as described above (session duration and campaign / UTM landing metrics). Optional marketing")} <em>${escapeHtml("emails")}</em> ${escapeHtml("are only sent with your separate consent (see section 3f).")}`,
    ),
    h2("5. Third-Party Services"),
    p(
      "We use third-party services to provide and improve our Game. We have concluded Data Processing Addendums (DPAs) with these providers where required.",
    ),
    h3("a) Supabase:"),
    p(
      "We use Supabase Inc. (USA) for our backend infrastructure, including authentication and database hosting. Supabase processes your email address, password hash, and game data on our behalf. We have configured our Supabase project to store all data within the EU (Frankfurt region). The legal basis for this is Art. 6(1)(b) and Art. 6(1)(f) GDPR. We have entered into a DPA with Supabase to ensure that your data is handled in compliance with the GDPR.",
    ),
    h3("b) Stripe:"),
    p(
      "For processing payments, we use Stripe Payments Europe, Ltd. (Ireland). When you make a purchase, you are redirected to Stripe's payment interface. Stripe collects payment information (e.g., credit card details) directly. We do not receive or store this sensitive financial data. Stripe is responsible for the secure processing of your payment data. The legal basis for using Stripe is Art. 6(1)(b) GDPR (performance of a contract).",
    ),
    h3("c) Resend:"),
    p(
      "We use Resend Inc. (USA) to send email on our behalf, including account-related messages (e.g. sign-up or password reset, where applicable) and, if you have opted in, promotional emails as described in section 3f. Resend processes the recipient address and the content needed to deliver each message. The legal basis is Art. 6(1)(b) GDPR for emails necessary to provide the service, and Art. 6(1)(a) GDPR for marketing emails (consent). We have entered into a DPA with Resend where required for processor relationships.",
    ),
    h3("d) Replit:"),
    p(
      "We host the A Dark Cave website and application backend via Replit, Inc. Replit processes technical data necessary to deliver the service (for example connection and server log data). Replit runs published apps on Google Cloud infrastructure. The legal basis is Art. 6(1)(b) and Art. 6(1)(f) GDPR. We use Replit under its terms and data processing terms applicable to our account.",
    ),
    h3("e) Playlight:"),
    p(
      "We integrate the Playlight game discovery SDK in the browser. When the SDK loads, Playlight may collect technical information such as IP address, browser type/version, pages visited, and access times, as described in Playlight's own privacy policy. We do not send your account email address to Playlight. The legal basis is Art. 6(1)(f) GDPR (legitimate interest in offering optional game discovery features). Playlight acts as an independent service with its own privacy practices for data it collects through the SDK.",
    ),
    h2("6. International Data Transfers"),
    p(
      "Your core account and cloud game save data are stored with Supabase in the EU (Frankfurt region). Some providers process data outside the European Economic Area (for example Resend in the United States, and hosting infrastructure used by Replit). Where a transfer to a third country requires safeguards under Art. 46 GDPR, we rely on appropriate mechanisms such as Standard Contractual Clauses in the provider's Data Processing Addendum, and any additional frameworks those providers lawfully rely on.",
    ),
    h2("7. Data Retention"),
    p("We store your data for the following periods:"),
    ul([
      "Account Data & Game Saves: Indefinitely, until you delete your account. Upon account deletion, all associated data is permanently removed.",
      "Purchase History: For legal and accounting reasons, we are required to retain purchase data for up to 10 years (according to German commercial and tax law).",
      "Marketing preferences: Kept for as long as your account exists so we can honor opt-in/opt-out and demonstrate consent; deleted when your account is deleted.",
      "Leaderboard entries: Kept while relevant to the leaderboard feature; removed when associated account data is deleted or as otherwise required for operating the leaderboard.",
    ]),
    h2("8. Data Security"),
    p(
      "We take appropriate technical and organizational measures to protect your data from unauthorized access, loss, or alteration. Communication with our servers is encrypted via SSL/TLS.",
    ),
  ].join("");
}

function termsBodyInnerHtml(): string {
  return [
    h1("Terms of Service"),
    p("Last Updated: 03.11.2025"),
    h2("§ 1 Scope and Provider"),
    ol([
      'These Terms of Service apply to the use of the browser game "A Dark Cave" (hereinafter referred to as "Game") provided by Julian Bauer, Königsberger Straße 1, 97072 Deutschland (hereinafter referred to as "Provider").',
      'By using the Game, you (hereinafter referred to as "User") agree to these terms. Deviating conditions of the User are not recognized unless the Provider expressly agrees to their validity in writing.',
      "The Game is offered to consumers. A consumer is any natural person who enters into a legal transaction for purposes that are predominantly neither commercial nor self-employed.",
    ]),
    h2("§ 2 Service Description"),
    olHtml([
      escapeHtml(
        '"A Dark Cave" is a text-based incremental survival/strategy game. The basic version of the game can be played free of charge.',
      ),
      escapeHtml(
        'Users have the option to create a free account to save their game progress on the Provider\'s servers ("Cloud Save"). The game can also be played without an account, in which case progress is saved locally in the User\'s browser.',
      ),
      `${escapeHtml("Optional promotional emails (e.g. updates or offers) are sent only with your separate consent and can be withdrawn anytime; see the")} <a href="/privacy">${escapeHtml("Privacy Policy")}</a> ${escapeHtml("for details.")}`,
      escapeHtml(
        "The Provider reserves the right to modify, interrupt, or discontinue the Game or parts thereof, temporarily or permanently, with or without notice.",
      ),
    ]),
    h2("§ 3 User Account"),
    ol([
      "To use the Cloud Save feature, the User must create an account by providing a valid email address and choosing a password. The User is responsible for the confidentiality of their login credentials.",
      "The User is obliged to provide truthful and complete information during registration.",
      "The User is responsible for all activities that occur under their account. The Provider must be informed immediately of any unauthorized use of the account.",
      "The Provider reserves the right to temporarily or permanently block or delete accounts, especially in cases of violation of these Terms of Service.",
    ]),
    h2("§ 4 Payment Terms and In-Game Purchases"),
    olHtml([
      `<strong>${escapeHtml("General:")}</strong> ${escapeHtml('Users can purchase virtual items (e.g., resources, tools, time-based boosts) within the Game for real money ("Purchases"). These items are intended to enhance the gameplay experience. Purchases are optional and the base game is playable without them.')}`,
      `<strong>${escapeHtml("Pricing:")}</strong> ${escapeHtml("All prices are displayed in EUR (€) and are final prices, including the applicable statutory value-added tax. We reserve the right to change the prices of virtual goods at any time.")}`,
      `<strong>${escapeHtml("Payment Processor:")}</strong> ${escapeHtml("We use Stripe Payments Europe, Ltd., as our external payment processor. Payment methods accepted are those supported by Stripe, primarily credit and debit cards. We do not collect or store any of your financial data (e.g., credit card numbers). This information is provided directly to Stripe and is subject to their privacy policy.")}`,
      `<strong>${escapeHtml("Conclusion of Contract:")}</strong> ${escapeHtml('The contract for a Purchase is concluded when you click the final "Buy Now" (or similarly labeled) button and your payment is successfully authorized by Stripe. Before this, you will be presented with a summary of your order and must explicitly agree to the immediate execution of the contract and waive your right of withdrawal.')}`,
      `<strong>${escapeHtml("Delivery:")}</strong> ${escapeHtml("The purchased virtual items will be credited to your game account immediately after successful payment confirmation.")}`,
      `<strong>${escapeHtml("No Refunds:")}</strong> ${escapeHtml("Beyond the statutory withdrawal rights, there is no right to a refund for purchased virtual items, unless required by mandatory law. Virtual items have no real-world monetary value and cannot be exchanged for cash.")}`,
      `<strong>${escapeHtml("No Subscriptions:")}</strong> ${escapeHtml("All purchases are one-time transactions. There are no recurring charges or subscriptions.")}`,
    ]),
    h2("§ 5 User Obligations"),
    ol([
      "The User agrees not to engage in any activity that interferes with or disrupts the Game or its servers.",
      "The use of cheats, bots, scripts, or any other form of manipulation is strictly prohibited.",
      "The User is solely responsible for their interactions within the Game. Harassment, insults, or any form of harmful behavior towards other users or the Provider is prohibited.",
    ]),
    h2("§ 6 Liability"),
    ol([
      "The Provider is liable without limitation for intent and gross negligence.",
      "For simple negligence, the Provider is liable only for damages resulting from the breach of essential contractual obligations (obligations whose fulfillment is essential for the proper execution of the contract and on whose observance the contractual partner regularly relies and may rely). In this case, liability is limited to the typically foreseeable damage.",
      "The above liability limitations do not apply in case of injury to life, body, or health.",
      "The Provider is not liable for data loss if the User does not use the Cloud Save feature or for damages caused by improper use of the account.",
    ]),
    h2("§ 7 Final Provisions"),
    ol([
      "The law of the Federal Republic of Germany shall apply, excluding the UN Convention on Contracts for the International Sale of Goods.",
      "Should individual provisions of these Terms of Service be or become invalid, the validity of the remaining provisions shall not be affected.",
      "The place of jurisdiction is [Your City], if the User is a merchant, a legal entity under public law, or a special fund under public law.",
      "The Provider reserves the right to amend these Terms of Service. Users will be informed of changes in a timely manner. If the User does not object to the changes within four weeks of notification, the amended terms shall be deemed accepted.",
    ]),
  ].join("");
}

function imprintBodyInnerHtml(): string {
  const odr = "https://ec.europa.eu/consumers/odr";
  return [
    h1("Impressum / Imprint"),
    h2(
      "Angaben gemäß § 5 TMG / Information pursuant to § 5 TMG (German Telemedia Act)",
    ),
    pHtml(
      ["<strong>Julian Bauer</strong>", "Königsberger Straße 1", "97072", "Deutschland"].join(
        "<br />",
      ),
    ),
    h3("Vertreten durch / Represented by:"),
    p("Julian Bauer"),
    h3("Kontakt / Contact:"),
    pHtml(
      `E-Mail: <a href="mailto:support@a-dark-cave.com">support@a-dark-cave.com</a>`,
    ),
    h3("Umsatzsteuer-ID / VAT ID:"),
    pHtml(
      `${escapeHtml("Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz / Value Added Tax Identification Number pursuant to § 27 a of the German Value Added Tax Act:")}<br />DE362802949`,
    ),
    h3(
      "Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV / Responsible for content pursuant to § 55 para. 2 RStV (German Interstate Broadcasting Treaty):",
    ),
    pHtml(
      ["Julian Bauer", "Königsberger Straße 1", "97072", "Deutschland"].join("<br />"),
    ),
    h3("Streitschlichtung / Dispute Resolution:"),
    pHtml(
      `${escapeHtml("Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:")} <a href="${odr}" rel="noopener noreferrer">${escapeHtml(odr)}</a>.<br />${escapeHtml("Unsere E-Mail-Adresse finden Sie oben im Impressum.")}<br />${escapeHtml("Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.")}`,
    ),
    pHtml(
      `${escapeHtml("The European Commission provides a platform for online dispute resolution (OS):")} <a href="${odr}" rel="noopener noreferrer">${escapeHtml(odr)}</a>.<br />${escapeHtml("You can find our email address in the legal notice above.")}<br />${escapeHtml("We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.")}`,
    ),
  ].join("");
}

function withdrawalBodyInnerHtml(): string {
  return [
    h1("Right of Withdrawal"),
    h2("Right of Withdrawal"),
    p(
      "You have the right to withdraw from this contract within fourteen days without giving any reason. The withdrawal period is fourteen days from the day the contract is concluded.",
    ),
    p("To exercise your right of withdrawal, you must inform us:"),
    pHtml(ADDRESS_BLOCK),
    p(
      "by means of a clear declaration (e.g., a letter sent by post or an email) of your decision to withdraw from this contract. You can use the attached model withdrawal form, but it is not mandatory.",
    ),
    p(
      "To meet the withdrawal deadline, it is sufficient for you to send your communication concerning your exercise of the right of withdrawal before the withdrawal period has expired.",
    ),
    h2("Consequences of Withdrawal"),
    p(
      "If you withdraw from this contract, we shall reimburse to you all payments received from you, including the costs of delivery (with the exception of the supplementary costs resulting from your choice of a type of delivery other than the least expensive type of standard delivery offered by us), without undue delay and in any event not later than fourteen days from the day on which we are informed about your decision to withdraw from this contract. We will carry out such reimbursement using the same means of payment as you used for the initial transaction unless you have expressly agreed otherwise; in any event, you will not incur any fees as a result of such reimbursement.",
    ),
    h2("Premature Expiry of the Right of Withdrawal"),
    p(
      "For contracts concerning the supply of digital content which is not supplied on a tangible medium, the right of withdrawal expires if we have begun with the performance of the contract after you have expressly consented that we begin with the performance of the contract before the expiry of the withdrawal period, and you have acknowledged your awareness that you lose your right of withdrawal by your consent with the beginning of the performance of the contract.",
    ),
    p(
      'In "A Dark Cave," the digital goods you purchase are delivered and credited to your account immediately. Therefore, before completing the purchase, you will be required to:',
    ),
    ol([
      "Expressly agree that we begin with the execution of the contract (i.e., the delivery of the digital item) before the withdrawal period ends.",
      "Acknowledge that by doing so, you waive your right of withdrawal.",
    ]),
    p(
      "This will be implemented via a checkbox that must be ticked before you can finalize the payment.",
    ),
    h2("Model Withdrawal Form"),
    p("(Complete and return this form only if you wish to withdraw from the contract)"),
    p("To:"),
    pHtml(ADDRESS_BLOCK),
    p(
      "I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*)/for the provision of the following service (*),",
    ),
    ul([
      "- Ordered on (*)/received on (*),",
      "- Name of consumer(s),",
      "- Address of consumer(s),",
      "- Signature of consumer(s) (only if this form is notified on paper),",
      "- Date",
    ]),
    p("(*) Delete as appropriate."),
  ].join("");
}

export function getNotFoundPageInnerHtml(): string {
  return [
    h1("404"),
    p("The darkness swallowed this page."),
    p("There is nothing here but silence and shadow."),
    `<p><a href="/">${escapeHtml("Return to the cave")}</a></p>`,
  ].join("");
}

export function getLegalPageInnerHtml(path: string): string | null {
  switch (path) {
    case "/privacy":
      return privacyBodyInnerHtml();
    case "/terms":
      return termsBodyInnerHtml();
    case "/imprint":
      return imprintBodyInnerHtml();
    case "/withdrawal":
      return withdrawalBodyInnerHtml();
    default:
      return null;
  }
}
