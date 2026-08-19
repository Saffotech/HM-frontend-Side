/**

 * IPD Insurance Final Bill / Claim Statement — A4 print & PDF layout.

 */



import { BrandLogo, BrandName } from '@/shared/components/common';

import { APP_NAME } from '@/shared/constants';

import './IpdInsuranceBillPrint.css';



function formatInr(value) {

  if (value == null || value === '') return 'N/A';

  const n = Number(value);

  if (Number.isNaN(n)) return 'N/A';

  return new Intl.NumberFormat('en-IN', {

    style: 'currency',

    currency: 'INR',

    maximumFractionDigits: 0,

  }).format(n);

}



function textOrNa(value) {

  const raw = value == null ? '' : String(value).trim();

  return raw || 'N/A';

}



function DetailGrid({ title, rows }) {

  return (

    <div className="ipd-ins-print-detail-col">

      <h3 className="ipd-ins-print-section-title">{title}</h3>

      <dl className="ipd-ins-print-dl">

        {rows.map(({ label, value }) => (

          <div key={label} className="ipd-ins-print-dl__row">

            <dt>{label}</dt>

            <dd>{value}</dd>

          </div>

        ))}

      </dl>

    </div>

  );

}



function SettlementRow({ label, value, muted }) {

  return (

    <tr className={muted ? 'ipd-ins-print-settle-row--muted' : undefined}>

      <td>{label}</td>

      <td className="ipd-ins-print-money">{formatInr(value)}</td>

    </tr>

  );

}



export default function IpdInsuranceBillPrintSheet({ model, className = '' }) {

  if (!model) return null;



  const { patient, admission, insurance, line_items: items, summary } = model;

  const showDiscount = Number(model.discount) > 0;



  const patientRows = [

    { label: 'Patient Name', value: textOrNa(patient.name) },

    { label: 'Patient ID', value: textOrNa(patient.patient_id) },

    {

      label: 'Age / Gender',

      value:

        patient.age && patient.gender

          ? `${patient.age} / ${patient.gender}`

          : textOrNa(patient.age_gender),

    },

    { label: 'Mobile', value: textOrNa(patient.phone) },

  ];



  const admissionRows = [

    { label: 'IPD No.', value: textOrNa(admission.ipd_id) },

    { label: 'Admitted', value: textOrNa(admission.admission_date) },

    { label: 'Discharged', value: textOrNa(admission.discharge_date) },

    { label: 'Doctor', value: textOrNa(admission.doctor) },

    { label: 'Ward / Room', value: textOrNa(admission.ward_room) },

    { label: 'Coverage', value: textOrNa(model.coverage) },

  ];



  const insuranceRows = insurance
    ? [
        { label: 'Insurance Company', value: textOrNa(insurance.company) },
        { label: 'Policy No.', value: textOrNa(insurance.policy_no) },
        { label: 'Policy Holder', value: textOrNa(insurance.policy_holder) },
        { label: 'Relationship', value: textOrNa(insurance.relationship) },
        { label: 'Claimed Amount', value: formatInr(insurance.claimed) },
        { label: 'Estimate Amount', value: formatInr(insurance.estimate_amount) },
      ]
    : [];



  const patientDue = summary.patient_amount_due ?? 0;

  const insurancePending = summary.insurance_amount_pending ?? 0;



  return (

    <div

      className={`ipd-ins-print-doc bill-print-zone${className ? ` ${className}` : ''}`}

      aria-hidden={className.includes('offscreen') ? true : undefined}

    >

      <header className="ipd-ins-print-header">

        <div className="ipd-ins-print-header__brand">

          <div className="ipd-ins-print-header__logo-row">

            <BrandLogo size={40} className="ipd-ins-print-header__logo" />

            <div>

              <h1 className="ipd-ins-print-header__hospital">

                <BrandName className="ipd-ins-print-header__brand-name" />

              </h1>

              <p className="ipd-ins-print-header__address">

                123 Health Avenue, Medical District, Mumbai — 400001

              </p>

              <p className="ipd-ins-print-header__contact">

                Tel: +91 800 123 4567 · billing@saffocare.com · GSTIN: 27AABCM1234A1Z5

              </p>

            </div>

          </div>

        </div>

        <div className="ipd-ins-print-header__meta">

          <p className="ipd-ins-print-header__doc-title">{model.document_title}</p>

          <table className="ipd-ins-print-meta-table">

            <tbody>

              <tr>

                <td>Bill No.</td>

                <td>{textOrNa(model.bill_number)}</td>

              </tr>

              <tr>

                <td>Date</td>

                <td>{textOrNa(model.bill_date)}</td>

              </tr>

              <tr>

                <td>Payment</td>

                <td>{textOrNa(model.payment_mode)}</td>

              </tr>

            </tbody>

          </table>

        </div>

      </header>



      <section className="ipd-ins-print-block ipd-ins-print-details">

        <DetailGrid title="Patient" rows={patientRows} />

        <DetailGrid title="Admission" rows={admissionRows} />

        {insurance ? (

          <DetailGrid title="Insurance / TPA" rows={insuranceRows} />

        ) : (

          <DetailGrid title="Insurance / TPA" rows={[{ label: 'Mode', value: 'Self Pay' }]} />

        )}

      </section>



      <section className="ipd-ins-print-block ipd-ins-print-charges">

        <h2 className="ipd-ins-print-section-heading">Hospital Charges</h2>

        <table className="ipd-ins-print-table ipd-ins-print-table--charges">

          <thead>

            <tr>

              <th className="col-num">#</th>

              <th className="col-desc">Description</th>

              <th className="col-qty">Qty</th>

              <th className="col-money">Rate (₹)</th>

              <th className="col-money">Amount (₹)</th>

            </tr>

          </thead>

          <tbody>

            {items.length === 0 ? (

              <tr>

                <td colSpan={5} className="ipd-ins-print-empty">

                  No charges available

                </td>

              </tr>

            ) : (

              items.map((item, idx) => (

                <tr key={`${item.description}-${idx}`}>

                  <td className="col-num">{idx + 1}</td>

                  <td className="col-desc">{item.description}</td>

                  <td className="col-qty">{item.qty}</td>

                  <td className="col-money">{formatInr(item.rate)}</td>

                  <td className="col-money">{formatInr(item.amount)}</td>

                </tr>

              ))

            )}

          </tbody>

          <tfoot>

            {showDiscount ? (

              <tr className="ipd-ins-print-charges-foot">

                <td colSpan={4} className="ipd-ins-print-charges-foot__label">

                  Less: Discount

                </td>

                <td className="col-money">({formatInr(model.discount)})</td>

              </tr>

            ) : null}

            <tr className="ipd-ins-print-charges-foot ipd-ins-print-charges-foot--net">

              <td colSpan={4} className="ipd-ins-print-charges-foot__label">

                Net Hospital Bill

              </td>

              <td className="col-money">{formatInr(model.net_hospital_bill)}</td>

            </tr>

          </tfoot>

        </table>

      </section>



      <section className="ipd-ins-print-block ipd-ins-print-avoid-break">

        <h2 className="ipd-ins-print-section-heading">Bill Settlement</h2>

        <table className="ipd-ins-print-table ipd-ins-print-table--summary ipd-ins-print-table--settle">

          <tbody>

            <SettlementRow label="Net Hospital Bill" value={summary.total_hospital_bill} />

            {insurance ? (

              <>

                <SettlementRow

                  label="Insurance Approved"

                  value={summary.approved_amount}

                />

                <SettlementRow

                  label="Paid (Insurance)"

                  value={summary.ins_received}

                  muted

                />

                <SettlementRow

                  label="Unpaid (Insurance)"

                  value={summary.ins_outstanding}

                />

                <SettlementRow

                  label="Patient Share"

                  value={summary.patient_responsibility}

                />

                <SettlementRow label="Paid (Patient)" value={summary.patient_paid} muted />

                <SettlementRow

                  label="Unpaid (Patient)"

                  value={summary.patient_outstanding}

                />

              </>

            ) : (

              <SettlementRow label="Paid by Patient" value={summary.patient_paid} muted />

            )}

          </tbody>

        </table>

      </section>



      <section className="ipd-ins-print-final ipd-ins-print-avoid-break">

        <h2 className="ipd-ins-print-final__title">Paid / Unpaid</h2>

        <div className="ipd-ins-print-final__grid">

          <div

            className={`ipd-ins-print-final__box${

              summary.no_patient_due ? ' ipd-ins-print-final__box--clear' : ' ipd-ins-print-final__box--due'

            }`}

          >

            <span className="ipd-ins-print-final__label">Patient</span>

            <strong className="ipd-ins-print-final__value ipd-ins-print-final__value--paid">

              Paid {formatInr(summary.patient_paid)}

            </strong>

            {summary.no_patient_due ? (

              <strong className="ipd-ins-print-final__value ipd-ins-print-final__value--nil">

                Unpaid ₹0

              </strong>

            ) : (

              <strong className="ipd-ins-print-final__value">

                Unpaid {formatInr(patientDue)}

              </strong>

            )}

          </div>

          {insurance ? (

            <div

              className={`ipd-ins-print-final__box${

                summary.no_insurance_pending

                  ? ' ipd-ins-print-final__box--clear'

                  : ' ipd-ins-print-final__box--ins'

              }`}

            >

              <span className="ipd-ins-print-final__label">Insurance / TPA</span>

              <strong className="ipd-ins-print-final__value ipd-ins-print-final__value--paid">

                Paid {formatInr(summary.ins_received)}

              </strong>

              {summary.no_insurance_pending ? (

                <strong className="ipd-ins-print-final__value ipd-ins-print-final__value--nil">

                  Unpaid ₹0

                </strong>

              ) : (

                <strong className="ipd-ins-print-final__value">

                  Unpaid {formatInr(insurancePending)}

                </strong>

              )}

            </div>

          ) : null}

        </div>

        {summary.no_patient_due && summary.no_insurance_pending ? (

          <p className="ipd-ins-print-final__note">

            All dues cleared. No payment pending from patient or insurance.

          </p>

        ) : null}

      </section>



      <section className="ipd-ins-print-block ipd-ins-print-signatures ipd-ins-print-avoid-break">

        <div className="ipd-ins-print-signatures__grid">

          {['Patient / Guardian', 'Billing Staff', 'Authorized Signatory'].map(

            (label) => (

              <div key={label} className="ipd-ins-print-signature">

                <div className="ipd-ins-print-signature__line" />

                <p>{label}</p>

              </div>

            ),

          )}

        </div>

        <p className="ipd-ins-print-disclaimer">

          Computer-generated document. Signatures may be required by insurance / TPA.

        </p>

        <p className="ipd-ins-print-thanks">Thank you for choosing {APP_NAME}</p>

      </section>

    </div>

  );

}


