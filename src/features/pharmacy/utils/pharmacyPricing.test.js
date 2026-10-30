import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

function readSrc(relative) {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), relative), 'utf8');
}

describe('pharmacy dispense pricing uses backend data', () => {
  it('sends only DispenseItemRequest fields and never writes sessionStorage prices', () => {
    const workflow = readSrc('./dispenseWorkflow.js');
    const submit = readSrc('../../../shared/api/services/pharmacy.js');
    const api = readSrc('../api/pharmacy.js');

    assert.match(workflow, /prescription_item_id: itemDbId/);
    assert.match(workflow, /quantity_dispensed: qty/);
    assert.match(workflow, /amount,/);
    assert.doesNotMatch(workflow, /unit_price/);

    assert.match(submit, /prescription_item_id: itemId/);
    assert.match(submit, /quantity_dispensed: qty/);
    assert.match(submit, /amount,/);
    assert.doesNotMatch(submit, /unit_price,/);
    assert.match(submit, /prescription_id: Number\(prescriptionId\)/);

    assert.match(api, /DispenseItemRequest/);
    assert.match(api, /search\.set\('prescription_id'/);

    const pricing = readSrc('./dispensePricing.js');
    const dispensePage = readSrc('../pages/DispensePage.jsx');
    const detailPage = readSrc('../pages/PrescriptionDetailPage.jsx');

    for (const source of [pricing, workflow, dispensePage, detailPage, submit, api]) {
      assert.doesNotMatch(source, /writeHospitalSessionJson/);
      assert.doesNotMatch(source, /pharmacy-dispense-pricing/);
      assert.doesNotMatch(source, /persistDispensePricing/);
      assert.doesNotMatch(source, /recordPharmacyDispenseWithPricing/);
    }
  });

  it('displays persisted unit_price and amount from prescription and history responses', () => {
    const mapper = readSrc('../../../shared/api/mappers/pharmacyMapper.js');
    const detailPage = readSrc('../pages/PrescriptionDetailPage.jsx');

    assert.match(mapper, /unit_price: Number\(item\.unit_price\) \|\| 0/);
    assert.match(mapper, /amount_dispensed: Number\(item\.amount_dispensed\) \|\| 0/);
    assert.match(mapper, /total_amount_dispensed: Number\(raw\.total_amount_dispensed\) \|\| 0/);
    assert.match(mapper, /unit_price: Number\(row\.unit_price\) \|\| 0/);
    assert.match(mapper, /amount: Number\(row\.amount\) \|\| 0/);

    assert.match(detailPage, /total_amount_dispensed/);
    assert.match(detailPage, /item\.unit_price/);
    assert.match(detailPage, /item\.amount_dispensed/);
    assert.match(detailPage, /row\.unit_price/);
    assert.match(detailPage, /row\.amount/);
  });
});
