import { Input, Select } from '@/shared/components/common';
import { OTHER_LAB_TEST, testsForLabDepartment } from '@/features/doctor/constants';

export default function LabTestNameField({
  deptCode,
  testName = '',
  otherTest = false,
  onChange,
  disabled = false,
  error,
  label = 'Test *',
}) {
  const listed = testsForLabDepartment(deptCode);
  const isListed = listed.includes(testName);
  const isOther = Boolean(otherTest) || Boolean(testName && !isListed);
  const selectValue = isOther ? OTHER_LAB_TEST : testName;

  return (
    <div className="doc-lab-test-name">
      <Select
        label={label}
        value={selectValue}
        disabled={disabled || !deptCode}
        error={error}
        placeholder={deptCode ? 'Select test' : 'Select department first'}
        options={[
          ...listed.map((t) => ({ value: t, label: t })),
          { value: OTHER_LAB_TEST, label: 'Other' },
        ]}
        onChange={(value) => {
          if (value === OTHER_LAB_TEST) {
            onChange({
              testName: isListed ? '' : testName,
              otherTest: true,
            });
            return;
          }
          onChange({ testName: value, otherTest: false });
        }}
      />
      {isOther ? (
        <Input
          label="Custom test name"
          value={isListed ? '' : testName}
          placeholder="Enter new test name"
          onChange={(e) =>
            onChange({
              testName: e.target.value,
              otherTest: true,
            })
          }
        />
      ) : null}
    </div>
  );
}
