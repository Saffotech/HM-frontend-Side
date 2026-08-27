import { useMemo } from 'react';
import { Input, Select } from '@/shared/components/common';
import { OTHER_LAB_TEST, testsForLabDepartment } from '@/features/doctor/constants';
import { useLabCatalogQuery } from '@/features/doctor/hooks/useDoctorLabQuery';
import { filterCatalogTestsForDept } from '@/features/doctor/utils/labCatalogOptions';

/**
 * Test selector for new lab orders.
 * Always loads the active backend catalog (GET /lab-catalog?active=true) when a
 * department is chosen, so newly added tests appear without a frontend hardcode.
 * Falls back to hardcoded names only when the catalog is empty or unavailable.
 */
export default function LabTestNameField({
  deptCode,
  departmentId = null,
  testName = '',
  labTestId = null,
  otherTest = false,
  onChange,
  disabled = false,
  error,
  label = 'Test *',
}) {
  const catalogQuery = useLabCatalogQuery(
    { active: true },
    { enabled: Boolean(deptCode) },
  );
  const allCatalog = catalogQuery.data ?? [];
  const catalogTests = useMemo(
    () => filterCatalogTestsForDept(allCatalog, deptCode, departmentId),
    [allCatalog, deptCode, departmentId],
  );

  const catalogLoaded = Boolean(deptCode) && !catalogQuery.isLoading && !catalogQuery.isError;
  const useCatalog = catalogLoaded && allCatalog.length > 0;

  const listed = useCatalog
    ? catalogTests.map((t) => t.testName)
    : testsForLabDepartment(deptCode);

  const selectedCatalog = useCatalog
    ? catalogTests.find((t) => Number(t.id) === Number(labTestId))
      || catalogTests.find((t) => t.testName === testName)
      || allCatalog.find((t) => Number(t.id) === Number(labTestId))
      || allCatalog.find((t) => t.testName === testName)
    : null;

  const isListed = useCatalog
    ? Boolean(selectedCatalog)
    : listed.includes(testName);
  const allowOther = !useCatalog;
  const isOther = allowOther && (Boolean(otherTest) || Boolean(testName && !isListed));
  const selectValue = isOther
    ? OTHER_LAB_TEST
    : selectedCatalog
      ? String(selectedCatalog.id)
      : testName;

  const options = useCatalog
    ? catalogTests.map((t) => ({ value: String(t.id), label: t.testName }))
    : [
        ...listed.map((t) => ({ value: t, label: t })),
        { value: OTHER_LAB_TEST, label: 'Other' },
      ];

  const placeholder = !deptCode
    ? 'Select department first'
    : catalogQuery.isLoading
      ? 'Loading catalog…'
      : useCatalog
        ? catalogTests.length
          ? 'Select catalog test'
          : 'No catalog tests for this department'
        : 'Select test';

  return (
    <div className="doc-lab-test-name">
      <Select
        label={label}
        value={selectValue}
        disabled={disabled || !deptCode}
        error={error}
        placeholder={placeholder}
        options={options}
        onChange={(value) => {
          if (value === OTHER_LAB_TEST) {
            onChange({
              testName: isListed ? '' : testName,
              otherTest: true,
              labTestId: null,
              price: null,
            });
            return;
          }
          if (useCatalog) {
            const picked =
              catalogTests.find((t) => String(t.id) === String(value))
              || allCatalog.find((t) => String(t.id) === String(value));
            if (picked) {
              onChange({
                testName: picked.testName,
                otherTest: false,
                labTestId: picked.id,
                price: picked.price,
              });
              return;
            }
          }
          onChange({
            testName: value,
            otherTest: false,
            labTestId: null,
            price: null,
          });
        }}
      />
      {isOther ? (
        <Input
          label="Custom test name"
          value={isListed ? '' : testName}
          placeholder="Enter test name"
          onChange={(e) =>
            onChange({
              testName: e.target.value,
              otherTest: true,
              labTestId: null,
              price: null,
            })
          }
        />
      ) : null}
    </div>
  );
}
