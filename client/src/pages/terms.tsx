
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Terms() {
  return (
    <ScrollArea className="h-screen w-full bg-black">
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-3xl text-white">Terms of Service</CardTitle>
            <p className="text-sm text-gray-400">Last Updated: 03.11.2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm prose-invert max-w-none text-white legal-content">
            <h3>§ 1 Scope and Provider</h3>
            <ol>
              <li>These Terms of Service apply to the use of the browser game "A Dark Cave" (hereinafter referred to as "Game") provided by Julian Bauer, Königsberger Straße 1, 97072 Deutschland (hereinafter referred to as "Provider").</li>
              <li>By using the Game, you (hereinafter referred to as "User") agree to these terms. Deviating conditions of the User are not recognized unless the Provider expressly agrees to their validity in writing.</li>
              <li>The Game is offered to consumers. A consumer is any natural person who enters into a legal transaction for purposes that are predominantly neither commercial nor self-employed.</li>
            </ol>

            <h3>§ 2 Service Description</h3>
            <ol>
              <li>"A Dark Cave" is a text-based incremental survival/strategy game. The basic version of the game can be played free of charge.</li>
              <li>Users have the option to create a free account to save their game progress on the Provider's servers ("Cloud Save"). The game can also be played without an account, in which case progress is saved locally in the User's browser.</li>
              <li>The Provider reserves the right to modify, interrupt, or discontinue the Game or parts thereof, temporarily or permanently, with or without notice.</li>
            </ol>

            <h3>§ 3 User Account</h3>
            <ol>
              <li>To use the Cloud Save feature, the User must create an account by providing a valid email address and choosing a password. The User is responsible for the confidentiality of their login credentials.</li>
              <li>The User is obliged to provide truthful and complete information during registration.</li>
              <li>The User is responsible for all activities that occur under their account. The Provider must be informed immediately of any unauthorized use of the account.</li>
              <li>The Provider reserves the right to temporarily or permanently block or delete accounts, especially in cases of violation of these Terms of Service.</li>
            </ol>

            <h3>§ 4 Payment Terms and In-Game Purchases</h3>
            <ol>
              <li><strong>General:</strong> Users can purchase virtual items (e.g., resources, tools, time-based boosts) within the Game for real money ("Purchases"). These items are intended to enhance the gameplay experience. Purchases are optional and the base game is playable without them.</li>
              <li><strong>Pricing:</strong> All prices are displayed in EUR (€) and are final prices, including the applicable statutory value-added tax. We reserve the right to change the prices of virtual goods at any time.</li>
              <li><strong>Payment Processor:</strong> We use Stripe Payments Europe, Ltd., as our external payment processor. Payment methods accepted are those supported by Stripe, primarily credit and debit cards. We do not collect or store any of your financial data (e.g., credit card numbers). This information is provided directly to Stripe and is subject to their privacy policy.</li>
              <li><strong>Conclusion of Contract:</strong> The contract for a Purchase is concluded when you click the final "Buy Now" (or similarly labeled) button and your payment is successfully authorized by Stripe. Before this, you will be presented with a summary of your order and must explicitly agree to the immediate execution of the contract and waive your right of withdrawal.</li>
              <li><strong>Delivery:</strong> The purchased virtual items will be credited to your game account immediately after successful payment confirmation.</li>
              <li><strong>No Refunds:</strong> Beyond the statutory withdrawal rights, there is no right to a refund for purchased virtual items, unless required by mandatory law. Virtual items have no real-world monetary value and cannot be exchanged for cash.</li>
              <li><strong>No Subscriptions:</strong> All purchases are one-time transactions. There are no recurring charges or subscriptions.</li>
            </ol>

            <h3>§ 5 User Obligations</h3>
            <ol>
              <li>The User agrees not to engage in any activity that interferes with or disrupts the Game or its servers.</li>
              <li>The use of cheats, bots, scripts, or any other form of manipulation is strictly prohibited.</li>
              <li>The User is solely responsible for their interactions within the Game. Harassment, insults, or any form of harmful behavior towards other users or the Provider is prohibited.</li>
            </ol>

            <h3>§ 6 Liability</h3>
            <ol>
              <li>The Provider is liable without limitation for intent and gross negligence.</li>
              <li>For simple negligence, the Provider is liable only for damages resulting from the breach of essential contractual obligations (obligations whose fulfillment is essential for the proper execution of the contract and on whose observance the contractual partner regularly relies and may rely). In this case, liability is limited to the typically foreseeable damage.</li>
              <li>The above liability limitations do not apply in case of injury to life, body, or health.</li>
              <li>The Provider is not liable for data loss if the User does not use the Cloud Save feature or for damages caused by improper use of the account.</li>
            </ol>

            <h3>§ 7 Final Provisions</h3>
            <ol>
              <li>The law of the Federal Republic of Germany shall apply, excluding the UN Convention on Contracts for the International Sale of Goods.</li>
              <li>Should individual provisions of these Terms of Service be or become invalid, the validity of the remaining provisions shall not be affected.</li>
              <li>The place of jurisdiction is [Your City], if the User is a merchant, a legal entity under public law, or a special fund under public law.</li>
              <li>The Provider reserves the right to amend these Terms of Service. Users will be informed of changes in a timely manner. If the User does not object to the changes within four weeks of notification, the amended terms shall be deemed accepted.</li>
            </ol>
          </CardContent>
        </Card>
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
