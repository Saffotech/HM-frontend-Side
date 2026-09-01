/**
 * Date-wise daily charge lines — shared by insurance cashless and self / pay-and-claim.
 */

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, DateInput } from '@/shared/components/common';
import {
  calculateDailyChargesTotal,
  createDailyCharge,
  getDailyChargeItemPlaceholder,
  groupDailyChargesByDate,
  patchDailyCharge,
  sortDailyCharges,
} from '@/features/ipd/utils/insuranceDailyCharges';
import { toast } from '@/shared/utils/toast';
import IpdDailyChargesGroupItems from '@/features/ipd/components/IpdDailyChargesGroupItems';
import { formatCurrency } from '@/shared/utils/formatCurrency';

function formatChargeDate(iso) {
  if (!iso) return '—';
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function dailyChargeGroupEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.charge_date !== b.charge_date) return false;
  if (a.total !== b.total) return false;
  if (a.itemCount !== b.itemCount) return false;
  if (a.categories.join('|') !== b.categories.join('|')) return false;
  const ai = a.items;
  const bi = b.items;
  if (ai === bi) return true;
  if (!ai || !bi || ai.length !== bi.length) return false;
  for (let i = 0; i < ai.length; i++) {
    if (ai[i] !== bi[i]) return false;
  }
  return true;
}

const IpdDailyChargeDateGroup = memo(function IpdDailyChargeDateGroup({
  group,
  isOpen,
  onToggle,
  updateDailyCharge,
  removeDailyCharge,
}) {
  return (
    <div
      className={`ipd-ins-daily-group${
        isOpen ? ' ipd-ins-daily-group--open' : ''
      }`}
    >
      <button
        type="button"
        className="ipd-ins-daily-group__trigger"
        onClick={() => onToggle(group.charge_date)}
        aria-expanded={isOpen}
      >
        <span className="ipd-ins-daily-group__date">
          {formatChargeDate(group.charge_date)}
        </span>
        <span className="ipd-ins-daily-group__meta">
          {group.itemCount} item{group.itemCount === 1 ? '' : 's'} ·{' '}
          {group.categories.join(' · ')}
        </span>
        <strong className="ipd-ins-daily-group__total">
          {formatCurrency(group.total, { empty: '—' })}
        </strong>
        <ChevronDown
          size={18}
          aria-hidden
          className={`ipd-ins-daily-group__chev${
            isOpen ? ' ipd-ins-daily-group__chev--open' : ''
          }`}
        />
      </button>
      {isOpen ? (
        <div className="ipd-ins-daily-group__panel">
          <IpdDailyChargesGroupItems
            items={group.items}
            chargeDate={group.charge_date}
            updateDailyCharge={updateDailyCharge}
            removeDailyCharge={removeDailyCharge}
          />
        </div>
      ) : null}
    </div>
  );
}, (prev, next) => {
  if (prev.isOpen !== next.isOpen) return false;
  if (prev.onToggle !== next.onToggle) return false;
  if (prev.updateDailyCharge !== next.updateDailyCharge) return false;
  if (prev.removeDailyCharge !== next.removeDailyCharge) return false;
  return dailyChargeGroupEqual(prev.group, next.group);
});

function IpdDailyChargesCard({
  dailyCharges,
  onDailyChargesChange,
  onSave,
  saving = false,
  subtitle,
}) {
  const [newDailyDate, setNewDailyDate] = useState(todayIsoDate);
  const [newDailyHead, setNewDailyHead] = useState('Pharmacy');
  const [newDailyItem, setNewDailyItem] = useState('');
  const [newDailyQty, setNewDailyQty] = useState('1');
  const [newDailyAmount, setNewDailyAmount] = useState('');
  const [expandedDailyDate, setExpandedDailyDate] = useState(null);

  const dailyChargesRef = useRef(dailyCharges);
  dailyChargesRef.current = dailyCharges;

  const dailyChargeGroups = useMemo(
    () => groupDailyChargesByDate(dailyCharges),
    [dailyCharges],
  );
  const dailyChargesTotal = useMemo(
    () => calculateDailyChargesTotal(dailyCharges),
    [dailyCharges],
  );

  const updateDailyCharge = useCallback((id, patch) => {
    onDailyChargesChange(
      sortDailyCharges(
        dailyChargesRef.current.map((row) =>
          row.id === id ? patchDailyCharge(row, patch) : row,
        ),
      ),
    );
  }, [onDailyChargesChange]);

  const removeDailyCharge = useCallback((id) => {
    onDailyChargesChange(
      dailyChargesRef.current.filter((row) => row.id !== id),
    );
  }, [onDailyChargesChange]);

  const toggleDailyDate = useCallback((chargeDate) => {
    setExpandedDailyDate((prev) => (prev === chargeDate ? null : chargeDate));
  }, []);

  const addDailyCharge = () => {
    const amount = Number(newDailyAmount);
    const quantity = Number(newDailyQty);
    const itemName = newDailyItem.trim();
    if (!newDailyDate) {
      toast.error('Select a charge date');
      return;
    }
    if (!itemName) {
      toast.error(`Enter ${getDailyChargeItemPlaceholder(newDailyHead).toLowerCase()}`);
      return;
    }
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const created = createDailyCharge({
      charge_date: newDailyDate,
      head: newDailyHead,
      item_name: itemName,
      quantity,
      amount,
    });
    if (!created) {
      toast.error('Unable to add daily charge');
      return;
    }
    onDailyChargesChange(
      sortDailyCharges([...dailyChargesRef.current, created]),
    );
    setNewDailyItem('');
    setNewDailyQty('1');
    setNewDailyAmount('');
    setExpandedDailyDate(newDailyDate);
    toast.success('Daily charge added — save to keep');
  };

  return (
    <div className="ipd-card ipd-ins-daily-charges">
      <div className="ipd-card__head">
        <div>
          <h2 className="ipd-card__title">Daily Charges</h2>
          {subtitle ? (
            <p className="ipd-page__subtitle ipd-ins-daily-charges__hint">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Button type="button" size="sm" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Daily Charges'}
        </Button>
      </div>
      <div className="ipd-card__body">
        {dailyCharges.length === 0 ? (
          <p className="ipd-page__subtitle">
            No daily charges yet. Add room, doctor, lab, or pharmacy entries below.
          </p>
        ) : (
          <div className="ipd-ins-daily-groups">
            {dailyChargeGroups.map((group) => (
              <IpdDailyChargeDateGroup
                key={group.charge_date}
                group={group}
                isOpen={expandedDailyDate === group.charge_date}
                onToggle={toggleDailyDate}
                updateDailyCharge={updateDailyCharge}
                removeDailyCharge={removeDailyCharge}
              />
            ))}
          </div>
        )}

        <p className="ipd-claim-section-label ipd-ins-daily-add-label">Add charge</p>
        <div className="ipd-ins-daily-add">
          <DateInput
            value={newDailyDate}
            onChange={setNewDailyDate}
            aria-label="New daily charge date"
          />
          <input
            className="ipd-input"
            value={newDailyHead}
            onChange={(e) => setNewDailyHead(e.target.value)}
            placeholder="e.g. Pharmacy"
            aria-label="New daily charge head"
          />
          <input
            className="ipd-input"
            value={newDailyItem}
            onChange={(e) => setNewDailyItem(e.target.value)}
            placeholder={getDailyChargeItemPlaceholder(newDailyHead)}
            aria-label="New daily charge item"
          />
          <input
            className="ipd-input ipd-ins-daily-qty-input"
            value={newDailyQty}
            onChange={(e) =>
              setNewDailyQty(e.target.value.replace(/[^\d.]/g, ''))
            }
            placeholder="Qty"
            inputMode="decimal"
            aria-label="New daily charge quantity"
          />
          <input
            className="ipd-input ipd-ins-charge-input"
            value={newDailyAmount}
            onChange={(e) =>
              setNewDailyAmount(e.target.value.replace(/[^\d.]/g, ''))
            }
            placeholder="0"
            inputMode="decimal"
            aria-label="New daily charge amount"
          />
          <Button type="button" variant="secondary" size="sm" onClick={addDailyCharge}>
            + Add
          </Button>
        </div>

        <div className="ipd-ins-daily-total">
          <span>
            {dailyChargeGroups.length} day
            {dailyChargeGroups.length === 1 ? '' : 's'} · {dailyCharges.length}{' '}
            item{dailyCharges.length === 1 ? '' : 's'}
          </span>
          <strong>{formatCurrency(dailyChargesTotal, { empty: '—' })}</strong>
          <span className="ipd-ins-daily-total__note">
            Saves roll up into hospital charge heads
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(IpdDailyChargesCard);
