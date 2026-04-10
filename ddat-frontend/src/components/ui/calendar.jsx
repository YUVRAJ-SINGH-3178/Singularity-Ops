import { useMemo, useState } from "react";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthLabel(date) {
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function buildCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    days.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      date: new Date(year, month, day),
      inCurrentMonth: true,
    });
  }

  const trailing = (7 - (days.length % 7)) % 7;
  for (let day = 1; day <= trailing; day += 1) {
    days.push({
      date: new Date(year, month + 1, day),
      inCurrentMonth: false,
    });
  }

  return days;
}

export function Calendar({
  selected,
  onSelect,
  minDate,
  disabled = false,
  className = "",
}) {
  const selectedDate = selected ? startOfDay(selected) : null;
  const min = minDate ? startOfDay(minDate) : null;

  const [viewDate, setViewDate] = useState(() => {
    const base = selectedDate || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const dayItems = useMemo(() => buildCalendarDays(viewDate), [viewDate]);

  const goToPrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div
      className={joinClasses(
        "bg-[var(--color-yellow)] border-2 border-black rounded-xl p-2.5 shadow-hard",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goToPrevMonth}
          disabled={disabled}
          className="w-8 h-8 border-2 border-black rounded-md bg-white hover:bg-[var(--color-sage)] disabled:opacity-50 disabled:cursor-not-allowed font-black text-base text-black leading-none"
          aria-label="Previous month"
        >
          {"<"}
        </button>
        <div className="font-black text-black text-base">
          {monthLabel(viewDate)}
        </div>
        <button
          type="button"
          onClick={goToNextMonth}
          disabled={disabled}
          className="w-8 h-8 border-2 border-black rounded-md bg-white hover:bg-[var(--color-sage)] disabled:opacity-50 disabled:cursor-not-allowed font-black text-base text-black leading-none"
          aria-label="Next month"
        >
          {">"}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-bold text-black/85 py-0.5"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayItems.map(({ date, inCurrentMonth }) => {
          const dayValue = startOfDay(date);
          const isSelected = isSameDay(dayValue, selectedDate);
          const isBeforeMin = min ? dayValue < min : false;
          const isDisabled = disabled || isBeforeMin;

          return (
            <button
              type="button"
              key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
              onClick={() => !isDisabled && onSelect?.(dayValue)}
              disabled={isDisabled}
              className={joinClasses(
                "h-8 rounded-md border-2 border-black font-bold text-sm transition-colors",
                isSelected
                  ? "bg-black text-white"
                  : inCurrentMonth
                    ? "bg-white text-black hover:bg-[var(--color-sage)]"
                    : "bg-[#e7ddae] text-black/45",
                isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
