import PublicDocPage from "@/pages/publicDocPage";

export default function Withdrawal() {
  return (
    <PublicDocPage path="/withdrawal" heading="Right of Withdrawal">
      <h3>Right of Withdrawal</h3>
      <p>
        You have the right to withdraw from this contract within fourteen days
        without giving any reason. The withdrawal period is fourteen days from the
        day the contract is concluded.
      </p>
      <p>To exercise your right of withdrawal, you must inform us:</p>
      <p>
        Julian Bauer
        <br />
        Königsberger Straße 1<br />
        97072 Deutschland
        <br />
        Email: support@a-dark-cave.com
      </p>
      <p>
        by means of a clear declaration (e.g., a letter sent by post or an email)
        of your decision to withdraw from this contract. You can use the attached
        model withdrawal form, but it is not mandatory.
      </p>
      <p>
        To meet the withdrawal deadline, it is sufficient for you to send your
        communication concerning your exercise of the right of withdrawal before
        the withdrawal period has expired.
      </p>

      <h3>Consequences of Withdrawal</h3>
      <p>
        If you withdraw from this contract, we shall reimburse to you all payments
        received from you, including the costs of delivery (with the exception of
        the supplementary costs resulting from your choice of a type of delivery
        other than the least expensive type of standard delivery offered by us),
        without undue delay and in any event not later than fourteen days from the
        day on which we are informed about your decision to withdraw from this
        contract. We will carry out such reimbursement using the same means of
        payment as you used for the initial transaction unless you have expressly
        agreed otherwise; in any event, you will not incur any fees as a result of
        such reimbursement.
      </p>

      <h3>Premature Expiry of the Right of Withdrawal</h3>
      <p>
        <strong>
          For contracts concerning the supply of digital content which is not
          supplied on a tangible medium, the right of withdrawal expires if we
          have begun with the performance of the contract after you have expressly
          consented that we begin with the performance of the contract before the
          expiry of the withdrawal period, and you have acknowledged your
          awareness that you lose your right of withdrawal by your consent with
          the beginning of the performance of the contract.
        </strong>
      </p>
      <p>
        <strong>
          In "A Dark Cave," the digital goods you purchase are delivered and
          credited to your account immediately. Therefore, before completing the
          purchase, you will be required to:
        </strong>
      </p>
      <ol>
        <li>
          <strong>
            Expressly agree that we begin with the execution of the contract
            (i.e., the delivery of the digital item) before the withdrawal period
            ends.
          </strong>
        </li>
        <li>
          <strong>
            Acknowledge that by doing so, you waive your right of withdrawal.
          </strong>
        </li>
      </ol>
      <p>
        <strong>
          This will be implemented via a checkbox that must be ticked before you
          can finalize the payment.
        </strong>
      </p>

      <h2>Model Withdrawal Form</h2>
      <p className="italic text-neutral-400">
        (Complete and return this form only if you wish to withdraw from the
        contract)
      </p>
      <div className="rounded border border-neutral-800 bg-neutral-950 p-6">
        <p>To:</p>
        <p>
          Julian Bauer
          <br />
          Königsberger Straße 1<br />
          97072 Deutschland
          <br />
          Email: support@a-dark-cave.com
        </p>
        <p>
          I/We (*) hereby give notice that I/We (*) withdraw from my/our (*)
          contract of sale of the following goods (*)/for the provision of the
          following service (*),
        </p>
        <p>- Ordered on (*)/received on (*),</p>
        <p>- Name of consumer(s),</p>
        <p>- Address of consumer(s),</p>
        <p>
          - Signature of consumer(s) (only if this form is notified on paper),
        </p>
        <p>- Date</p>
        <p className="text-neutral-400">(*) Delete as appropriate.</p>
      </div>
    </PublicDocPage>
  );
}
