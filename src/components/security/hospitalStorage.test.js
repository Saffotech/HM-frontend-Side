/* eslint-disable import/no-unresolved -- Node's test runner resolves node: imports. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PLATFORM_STORAGE_KEY,
  SESSION_NOTICE_KEY,
  isHospitalDataStorageKey,
  matchesHospitalBump,
  readHospitalSessionJson,
  readNurseHandoverPrefill,
  readNurseListMode,
  writeHospitalSessionJson,
  writeHospitalBump,
  writeNurseHandoverPrefill,
  writeNurseListMode,
} from './hospitalBrowserStorage.js';
import { performHospitalCleanup } from './hospitalCleanup.js';
import { setHospitalStorageScope } from './hospitalStorageScope.js';
import { beginNewSessionEpoch, currentSessionEpoch } from './sessionEpoch.js';
import { mergeBedTypes, resolveBedType, setBedTypesInOverlay } from '../../shared/utils/bedTypeOverlay.js';
import { shouldUseOpdLocalFallback } from '../../features/manager/utils/opdSettingsFallback.js';
import {
  readLocalOpdSettings,
  writeLocalOpdSettings,
} from '../../features/manager/utils/opdSettingsStorage.js';
import {
  loadPermissionCatalog,
  savePermissionCatalog,
} from '../../features/manager/utils/permissionCatalog.js';
import {
  cacheIpdConsultVisit,
  getIpdConsultVisitStore,
} from '../../features/doctor/utils/ipdConsultVisitCache.js';
import {
  clearAllConsultationDrafts,
  loadConsultationDraft,
  saveConsultationDraft,
} from '../../shared/utils/consultationDraftStorage.js';

function readSrc(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function installBrowserStorage() {
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();
  const windowObject = {
    localStorage,
    sessionStorage,
    dispatchEvent() {},
  };
  globalThis.localStorage = localStorage;
  globalThis.sessionStorage = sessionStorage;
  globalThis.window = windowObject;
  return { localStorage, sessionStorage };
}

describe('OPD settings fallback stays inside the current tenant', () => {
  it('does not read another tenant cache and refuses permission-denied fallbacks', () => {
    installBrowserStorage();
    setHospitalStorageScope({ tenantId: 1, userId: 10 });
    writeLocalOpdSettings({ pricing: { gst_percent: 12 } });

    setHospitalStorageScope({ tenantId: 2, userId: 20 });
    assert.equal(readLocalOpdSettings(), null);
    assert.equal(readLocalOpdSettings(1)?.pricing?.gst_percent, 12);
    assert.equal(globalThis.localStorage.getItem('hms_admin_opd_settings_v1'), null);

    assert.equal(shouldUseOpdLocalFallback({ status: 403, detail: 'Permission denied: opd' }), false);
    assert.equal(shouldUseOpdLocalFallback({ status: 400, message: 'Invalid settings' }), false);
    assert.equal(shouldUseOpdLocalFallback({ status: 0 }), true);
    assert.equal(shouldUseOpdLocalFallback({ status: 0, code: 'session_superseded' }), false);
    assert.equal(shouldUseOpdLocalFallback({ status: 404 }), true);

    const service = readSrc('../../shared/api/services/adminOpdSettings.js');
    assert.match(service, /shouldUseOpdLocalFallback/);
    assert.doesNotMatch(service, /hms_admin_opd_settings_v1[`'"]\)/);
  });
});

describe('bed type display uses the bed API', () => {
  it('keeps API bed_type and ignores the old overlay', () => {
    const { localStorage } = installBrowserStorage();
    localStorage.setItem('hm_bed_type_overlay_v1', JSON.stringify({ 5: 'double' }));

    assert.equal(resolveBedType({ id: 5 }), 'single');
    assert.equal(resolveBedType({ id: 5, bed_type: 'double' }), 'double');
    assert.equal(mergeBedTypes([{ id: 8, bed_type: 'double' }])[0].bed_type, 'double');
    assert.equal(mergeBedTypes([{ id: 8 }])[0].bed_type, 'single');

    setBedTypesInOverlay({ id: 5, bed_type: 'double' });
    assert.equal(localStorage.getItem('hm_bed_type_overlay_v1'), JSON.stringify({ 5: 'double' }));

    const beds = readSrc('../../features/manager/components/ManagerOpdBedsSection.jsx');
    assert.match(beds, /bed_type: bedType/);
    assert.match(beds, /bed_type: editForm\.bed_type/);
    assert.doesNotMatch(beds, /setBedTypesInOverlay/);
  });
});

describe('permission catalog does not survive a user change', () => {
  it('loads only the current tenant and user, then clears on cleanup', () => {
    const { localStorage } = installBrowserStorage();
    localStorage.setItem('hms_admin_permission_catalog', JSON.stringify([{ id: 1, name: 'old:view' }]));

    setHospitalStorageScope({ tenantId: 1, userId: 10 });
    savePermissionCatalog([{ id: 4, name: 'patients:view' }]);
    assert.deepEqual(loadPermissionCatalog(), [{ id: 4, name: 'patients:view' }]);

    setHospitalStorageScope({ tenantId: 1, userId: 11 });
    assert.deepEqual(loadPermissionCatalog(), []);

    setHospitalStorageScope({ tenantId: 2, userId: 10 });
    assert.deepEqual(loadPermissionCatalog(), []);

    performHospitalCleanup();
    assert.equal(localStorage.getItem('hms_admin_permission_catalog'), null);
    assert.equal(localStorage.getItem('hms_admin_permission_catalog:1:10'), null);
  });
});

describe('doctor IPD cache and consultation drafts', () => {
  it('keeps clinical notes and drafts inside the current tenant and user', () => {
    installBrowserStorage();
    const epochA = currentSessionEpoch();
    setHospitalStorageScope({ tenantId: 1, userId: 10 });
    cacheIpdConsultVisit({
      admissionId: 44,
      patientUid: 'P-1',
      visitNotes: 'Hospital A note',
      visitedAt: '2026-10-15T06:00:00.000Z',
      epochAtStart: epochA,
    });
    saveConsultationDraft(55, 10, { symptoms: 'fever from A' });

    setHospitalStorageScope({ tenantId: 2, userId: 20 });
    assert.deepEqual(getIpdConsultVisitStore(), {});
    assert.equal(loadConsultationDraft(55, 10), null);

    beginNewSessionEpoch();
    setHospitalStorageScope({ tenantId: 2, userId: 20 });
    cacheIpdConsultVisit({
      admissionId: 44,
      patientUid: 'P-1',
      visitNotes: 'stale hospital A note',
      visitedAt: '2026-10-15T06:05:00.000Z',
      epochAtStart: epochA,
    });
    assert.deepEqual(getIpdConsultVisitStore(), {});

    saveConsultationDraft(55, 20, { symptoms: 'hospital B' });
    clearAllConsultationDrafts();
    assert.equal(loadConsultationDraft(55, 20), null);
  });
});

describe('pharmacy pricing cannot cross hospitals', () => {
  it('reads only the current tenant record', () => {
    const { sessionStorage } = installBrowserStorage();
    setHospitalStorageScope({ tenantId: 1, userId: 10 });
    writeHospitalSessionJson('pharmacy-dispense-pricing:', 9, [{ id: 'a', amount: 50 }]);
    writeHospitalSessionJson('ipd-pharmacy-admission:', 3, [{ id: 'b', amount: 80 }]);
    writeHospitalSessionJson('ipd-pharmacy-patient:', 'P-1', [{ id: 'c', amount: 20 }]);
    sessionStorage.setItem('pharmacy-dispense-pricing:9', JSON.stringify([{ id: 'legacy', amount: 1 }]));

    setHospitalStorageScope({ tenantId: 2, userId: 20 });
    assert.deepEqual(readHospitalSessionJson('pharmacy-dispense-pricing:', 9, []), []);
    assert.deepEqual(readHospitalSessionJson('ipd-pharmacy-admission:', 3, []), []);
    assert.deepEqual(readHospitalSessionJson('ipd-pharmacy-patient:', 'P-1', []), []);

    const pricing = readSrc('../../features/pharmacy/utils/dispensePricing.js');
    assert.doesNotMatch(pricing, /readHospitalSessionJson/);
    assert.doesNotMatch(pricing, /writeHospitalSessionJson/);
    assert.doesNotMatch(pricing, /sessionStorage/);
    assert.doesNotMatch(pricing, /epochAtStart/);

    const dispensePage = readSrc('../../features/pharmacy/pages/DispensePage.jsx');
    assert.doesNotMatch(dispensePage, /recordPharmacyDispenseWithPricing/);
    assert.doesNotMatch(dispensePage, /persistDispensePricing/);

    const detailPage = readSrc('../../features/pharmacy/pages/PrescriptionDetailPage.jsx');
    assert.doesNotMatch(detailPage, /loadPrescriptionDispensePricing/);
    assert.doesNotMatch(detailPage, /matchDispenseHistoryPricing/);
    assert.match(detailPage, /total_amount_dispensed/);
    assert.match(detailPage, /amount_dispensed/);
    assert.match(detailPage, /row\.unit_price/);
    assert.match(detailPage, /row\.amount/);

    const workflow = readSrc('../../features/pharmacy/utils/dispenseWorkflow.js');
    assert.match(workflow, /amount,/);
    assert.doesNotMatch(workflow, /unit_price,/);
  });
});

describe('nurse preferences and handover flags', () => {
  it('does not apply one user preference or prefill flag to another user', () => {
    installBrowserStorage();
    setHospitalStorageScope({ tenantId: 1, userId: 10 });
    writeNurseListMode('allocated');
    writeNurseHandoverPrefill(7, 'done');

    setHospitalStorageScope({ tenantId: 1, userId: 11 });
    assert.equal(readNurseListMode(), null);
    assert.equal(readNurseHandoverPrefill(7), null);

    setHospitalStorageScope({ tenantId: 2, userId: 10 });
    assert.equal(readNurseListMode(), null);
    assert.equal(readNurseHandoverPrefill(7), null);
  });
});

describe('logout removes hospital browser data', () => {
  it('clears hospital keys and leaves platform storage, the login notice, and unrelated preferences', () => {
    const { localStorage, sessionStorage } = installBrowserStorage();
    setHospitalStorageScope({ tenantId: 1, userId: 10 });
    writeLocalOpdSettings({ pricing: { gst_percent: 5 } });
    savePermissionCatalog([{ id: 1, name: 'patients:view' }]);
    writeHospitalSessionJson('pharmacy-dispense-pricing:', 4, [{ id: 'rx' }]);
    writeNurseListMode('all');
    localStorage.setItem(PLATFORM_STORAGE_KEY, '{"platformSession":true}');
    localStorage.setItem(SESSION_NOTICE_KEY, 'Hospital is inactive');
    localStorage.setItem('ui-theme', 'light');
    localStorage.setItem('hm_bed_type_overlay_v1', '{}');
    localStorage.setItem('hms:doctor-ipd-bump', '1');
    sessionStorage.setItem('ipd-ins-admit-ctx:9', '{"admission":{"id":9}}');
    sessionStorage.setItem('access_token', 'keep-until-auth-cleanup');

    performHospitalCleanup({ clearDrafts: clearAllConsultationDrafts });

    assert.equal(localStorage.getItem(PLATFORM_STORAGE_KEY), '{"platformSession":true}');
    assert.equal(localStorage.getItem(SESSION_NOTICE_KEY), 'Hospital is inactive');
    assert.equal(localStorage.getItem('ui-theme'), 'light');
    assert.equal(sessionStorage.getItem('access_token'), 'keep-until-auth-cleanup');
    assert.equal(localStorage.getItem('hm_bed_type_overlay_v1'), null);
    assert.equal(localStorage.getItem('hms:doctor-ipd-bump'), null);
    assert.equal(localStorage.getItem('hms_admin_opd_settings_v1:1'), null);
    assert.equal(sessionStorage.getItem('pharmacy-dispense-pricing:1:4'), null);
    assert.equal(sessionStorage.getItem('nurse-patient-list-mode:1:10'), null);
    assert.equal(sessionStorage.getItem('ipd-ins-admit-ctx:9'), null);
    assert.equal(isHospitalDataStorageKey(PLATFORM_STORAGE_KEY), false);
  });
});

describe('hospital A logout then hospital B login in the same tab', () => {
  it('does not let hospital B read hospital A storage', () => {
    const { localStorage } = installBrowserStorage();
    localStorage.setItem(PLATFORM_STORAGE_KEY, '{"platformSession":true}');
    setHospitalStorageScope({ tenantId: 1, userId: 10 });
    writeLocalOpdSettings({ pricing: { gst_percent: 18 } });
    savePermissionCatalog([{ id: 2, name: 'billing:view' }]);
    saveConsultationDraft(9, 10, { diagnosis: 'A' });

    performHospitalCleanup({ clearDrafts: clearAllConsultationDrafts });

    setHospitalStorageScope({ tenantId: 2, userId: 30 });
    assert.equal(readLocalOpdSettings(), null);
    assert.deepEqual(loadPermissionCatalog(), []);
    assert.equal(loadConsultationDraft(9, 10), null);
    assert.equal(localStorage.getItem(PLATFORM_STORAGE_KEY), '{"platformSession":true}');

    writeLocalOpdSettings({ pricing: { gst_percent: 5 } });
    assert.equal(localStorage.getItem('hms_admin_opd_settings_v1:1'), null);
    assert.equal(readLocalOpdSettings(2)?.pricing?.gst_percent, 5);
  });
});

describe('platform admin storage stays unchanged', () => {
  it('never treats saffocare.platform.v1 as hospital data', () => {
    const platform = readSrc(`../../features/Platform Admin/shared/context/PlatformContext.jsx`);
    const browserStorage = readSrc('./hospitalBrowserStorage.js');
    assert.match(platform, /saffocare\.platform\.v1/);
    assert.match(browserStorage, /saffocare\.platform\.v1/);
    assert.equal(isHospitalDataStorageKey('saffocare.platform.v1'), false);
  });
});

describe('existing module workflows still use their APIs', () => {
  it('keeps bed creation, OPD settings, and pharmacy dispense on their current requests', () => {
    const beds = readSrc('../../features/manager/components/ManagerOpdBedsSection.jsx');
    const opd = readSrc('../../shared/api/services/adminOpdSettings.js');
    const dispense = readSrc('../../features/pharmacy/pages/DispensePage.jsx');
    assert.match(beds, /createMut\.mutateAsync/);
    assert.match(beds, /updateMut\.mutateAsync/);
    assert.match(opd, /getOpdSettingsApi/);
    assert.match(opd, /updateOpdSettingsApi/);
    assert.match(dispense, /dispenseMutation\.mutateAsync/);
  });
});

describe('storage call sites stay scoped', () => {
  it('does not read or write the old unscoped hospital keys', () => {
    const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
    const files = [];
    const walk = (dir) => {
      readdirSync(dir).forEach((entry) => {
        if (entry === 'node_modules' || entry === 'dist') return;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          return;
        }
        if (/\.(js|jsx)$/.test(entry) && !/\.test\.(js|jsx)$/.test(entry)) files.push(full);
      });
    };
    walk(srcRoot);

    const unscopedLiteral = /(?:localStorage|sessionStorage)\.(?:get|set|remove)Item\(\s*['"`](?:hms_admin_opd_settings_v1|hm_bed_type_overlay_v1|hms_admin_permission_catalog|hms:doctor:ipd-consult-visits|hms:doctor-ipd-bump|hms:doctor-permissions-bump|hms:nurse-permissions-bump|hms:lab-permissions-bump|hms:receptionist-permissions-bump|hms:pharmacy-permissions-bump|nurse-patient-list-mode)['"`]/;
    const unscopedTemplate = /(?:localStorage|sessionStorage)\.(?:get|set|remove)Item\(\s*`(?:pharmacy-dispense-pricing|ipd-pharmacy-admission|ipd-pharmacy-patient|ipd-ins-admit-ctx|nurse-handover-prefill):\$\{/;
    const offenders = [];
    files.forEach((file) => {
      const source = readFileSync(file, 'utf8');
      if (unscopedLiteral.test(source) || unscopedTemplate.test(source)) offenders.push(file);
    });
    assert.deepEqual(offenders, []);
  });

  it('writes a permission bump only for the current tenant', () => {
    const { localStorage } = installBrowserStorage();
    setHospitalStorageScope({ tenantId: 1, userId: 10 });
    writeHospitalBump('hms:doctor-permissions-bump');
    assert.equal(localStorage.getItem('hms:doctor-permissions-bump'), null);
    assert.equal(typeof localStorage.getItem('hms:doctor-permissions-bump:1'), 'string');
    assert.equal(matchesHospitalBump('hms:doctor-permissions-bump:1', 'hms:doctor-permissions-bump'), true);
    assert.equal(matchesHospitalBump('hms:doctor-permissions-bump', 'hms:doctor-permissions-bump'), false);

    setHospitalStorageScope({ tenantId: 2, userId: 20 });
    assert.equal(matchesHospitalBump('hms:doctor-permissions-bump:1', 'hms:doctor-permissions-bump'), false);
  });
});
