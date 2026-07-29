import { Plus, X } from 'lucide-react';
import { Button, Input, Label, Select, MoneyAmount } from '@/shared/components/common';
import { QUICK_BILL_ITEMS } from '@/shared/constants/billing';
import { formatCurrency } from '@/shared/utils/formatCurrency';

export default function OpdBillItemsTable({
  items,
  itemsScrollRef,
  quickAddSelection,
  onQuickAddSelect,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  billItems = QUICK_BILL_ITEMS,
  allowManualPriceEntry = true,
}) {
  const catalog = billItems?.length ? billItems : QUICK_BILL_ITEMS;

  return (
    <div className="items-table-wrap">
      <div className="items-table-wrap__top">
        <div className="opd-quick-add-row">
          <Label className="opd-quick-add-row__label">Quick Add Items</Label>
          <Select
            value={quickAddSelection}
            onChange={onQuickAddSelect}
            placeholder="Choose item to add..."
            options={[
              { value: '', label: 'Choose item to add...' },
              ...catalog.map((qi) => ({
                value: qi.name,
                label: `${qi.name} (${formatCurrency(qi.price)})`,
              })),
            ]}
            className="opd-quick-add-row__select"
          />
        </div>
      </div>

      <div className="items-table-wrap__scroll" ref={itemsScrollRef}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Subtotal</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Input
                    value={item.name}
                    onChange={(e) => onUpdateItem(item.id, 'name', e.target.value)}
                    placeholder="Description"
                    disabled={!allowManualPriceEntry && Boolean(item.fromCatalog)}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => onUpdateItem(item.id, 'qty', Number(e.target.value))}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) =>
                      onUpdateItem(item.id, 'unitPrice', Number(e.target.value))
                    }
                    disabled={!allowManualPriceEntry}
                    readOnly={!allowManualPriceEntry}
                  />
                </td>
                <td className="col-money">
                  <MoneyAmount amount={item.qty * item.unitPrice} strong />
                </td>
                <td>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <X size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="items-table-wrap__bottom">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddItem}
          disabled={!allowManualPriceEntry}
        >
          <Plus size={16} /> Add Row
        </Button>
      </div>
    </div>
  );
}
