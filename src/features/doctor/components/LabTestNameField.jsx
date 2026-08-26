import { Input, Select } from '@/shared/components/common';
import { OTHER_LAB_TEST, testsForLabDepartment } from '@/features/doctor/constants';
import { useLabCatalogQuery } from '@/features/doctor/hooks/useDoctorLabQuery';

/**
 * Test selector for new lab orders.
 * Prefers active catalog options (lab_test_id). Falls back to hardcoded names
 * when catalog is empty or unavailable (temporary compatibility path).
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
    { active: true, department_id: departmentId },
    { enabled: Boolean(departmentId) },
  );
  const catalogTests = catalogQuery.data ?? [];
  const useCatalog = Boolean(departmentId) && catalogTests.length > 0 && !catalogQuery.isError;

  const listed = useCatalog
    ? catalogTests.map((t) => t.testName)
    : testsForLabDepartment(deptCode);

  const selectedCatalog = useCatalog
    ? catalogTests.find((t) => Number(t.id) === Number(labTestId))
      || catalogTests.find((t) => t.testName === testName)
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
    ? catalogTests.map((t) => ({ value: String(t.id), label: t.label }))
    : [
        ...listed.map((t) => ({ value: t, label: t })),
        { value: OTHER_LAB_TEST, label: 'Other' },
      ];

  const placeholder = !deptCode
    ? 'Select department first'
    : catalogQuery.isLoading
      ? 'Loading catalog…'
      : useCatalog
        ? 'Select catalog test'
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
            const picked = catalogTests.find((t) => String(t.id) === String(value));
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
      {useCatalog && selectedCatalog?.price != null ? (
        <p className="doc-lab-test-name__price text-muted">
          Catalog price: ₹{selectedCatalog.price} (stored on the order when saved)
        </p>
      ) : null}
    </div>
  );
}
