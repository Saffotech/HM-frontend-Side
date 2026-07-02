import { memo } from 'react';

import Skeleton from '@/shared/components/common/Skeleton';



function DashboardFilterBar({ summary, activeFilter, onFilterChange, isLoading = false }) {

  return (

    <div className="doc-stat-grid" role="tablist" aria-label="Filter appointments">

      {summary.map((s) => {

        const isSelected = activeFilter === s.filter;

        return (

          <button

            key={s.filter}

            type="button"

            role="tab"

            aria-selected={isSelected}

            className={`doc-stat doc-stat--clickable${isSelected ? ' doc-stat--selected' : ''}`}

            onClick={() => onFilterChange(s.filter)}

            aria-busy={isLoading || undefined}

          >

            <div className={`doc-stat__icon ${s.tint}`}>

              <s.icon size={20} aria-hidden />

            </div>

            <div>

              <div className="doc-stat__value doc-stat__value--dashboard">

                {isLoading ? (

                  <Skeleton className="doc-stat__value-skeleton" width={40} height={24} />

                ) : (

                  s.value

                )}

              </div>

              <div className="doc-stat__label">{s.label}</div>

            </div>

          </button>

        );

      })}

    </div>

  );

}



export default memo(DashboardFilterBar);

