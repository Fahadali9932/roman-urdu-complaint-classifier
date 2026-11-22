import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import './department-deadline-picker.css';

interface DepartmentDeadlinePickerProps {
  id: string;
  label: string;
  value: string;
  min: string;
  onChange: (value: string) => void;
}

const pad = (value: number) => String(value).padStart(2, '0');
const localDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const combine = (day: string, hour: number, minute: number) => `${day}T${pad(hour)}:${pad(minute)}`;
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function readable(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'Choose a date and time';
  const month = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(parsed);
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(parsed);
  return `${parsed.getDate()} ${month} ${parsed.getFullYear()} · ${time}`;
}

/**
 * An inline calendar that remains in document flow. Unlike native
 * datetime-local popovers, it cannot cover the officer/instructions controls.
 * Values remain local wall-clock timestamps as expected by the work-order RPC.
 */
export function DepartmentDeadlinePicker({ id, label, value, min, onChange }: DepartmentDeadlinePickerProps) {
  const [expanded, setExpanded] = useState(false);
  const selected = new Date(value);
  const minimum = new Date(min);
  const selectedSafe = Number.isFinite(selected.getTime()) ? selected : new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selectedSafe.getFullYear(), selectedSafe.getMonth(), 1));
  const [year, month] = [visibleMonth.getFullYear(), visibleMonth.getMonth()];
  const selectedDay = localDay(selectedSafe);
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const count = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const invalid = !Number.isFinite(selected.getTime()) || (Number.isFinite(minimum.getTime()) && selected < minimum);
  const options = useMemo(() => [0, 15, 30, 45, selectedSafe.getMinutes()].filter((v, index, list) => list.indexOf(v) === index).sort((a, b) => a - b), [selectedSafe.getMinutes()]);
  const displayedHour = selectedSafe.getHours() % 12 || 12;
  const period = selectedSafe.getHours() >= 12 ? 'PM' : 'AM';

  const choose = (day: string, hour = selectedSafe.getHours(), minute = selectedSafe.getMinutes()) => {
    onChange(combine(day, hour, minute));
  };

  const preset = (daysAhead: number) => {
    const next = new Date();
    next.setDate(next.getDate() + daysAhead);
    next.setHours(17, 0, 0, 0);
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    choose(localDay(next), 17, 0);
    setExpanded(false);
  };

  const changeTime = (hour12: number, minute: number, amPm: string) => {
    const hour24 = (hour12 % 12) + (amPm === 'PM' ? 12 : 0);
    choose(selectedDay, hour24, minute);
  };

  return (
    <div className="deadline-picker" data-testid={id}>
      <span className="deadline-picker-label" id={`${id}-label`}>{label}</span>
      <button
        type="button"
        className="deadline-picker-trigger"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-expanded={expanded}
        aria-controls={`${id}-panel`}
        onClick={() => setExpanded((open) => !open)}
      >
        <CalendarDays size={17} aria-hidden="true" />
        <span id={`${id}-value`}>{readable(value)}</span>
        <ChevronDown size={16} className={expanded ? 'deadline-picker-rotated' : ''} aria-hidden="true" />
      </button>
      {expanded && (
        <div className="deadline-picker-panel" id={`${id}-panel`}>
          <div className="deadline-picker-presets" aria-label="Quick deadlines">
            <button type="button" onClick={() => preset(1)}>Tomorrow, 5 PM</button>
            <button type="button" onClick={() => preset(3)}>In 3 days</button>
            <button type="button" onClick={() => preset(7)}>Next week</button>
          </div>
          <div className="deadline-picker-month">
            <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(year, month - 1, 1))} disabled={new Date(year, month, 1) <= new Date(minimum.getFullYear(), minimum.getMonth(), 1)}><ChevronLeft size={17}/></button>
            <strong>{new Intl.DateTimeFormat('en-PK', { month: 'long', year: 'numeric' }).format(visibleMonth)}</strong>
            <button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}><ChevronRight size={17}/></button>
          </div>
          <div className="deadline-picker-calendar" aria-label="Select deadline date">
            {weekDays.map((day) => <span className="deadline-picker-weekday" key={day}>{day}</span>)}
            {Array.from({ length: count }, (_, index) => {
              const dayNumber = index - firstWeekday + 1;
              if (dayNumber < 1 || dayNumber > daysInMonth) return <span key={`empty-${index}`} aria-hidden="true" />;
              const date = new Date(year, month, dayNumber);
              const dateKey = localDay(date);
              const disabled = Number.isFinite(minimum.getTime()) && date < new Date(minimum.getFullYear(), minimum.getMonth(), minimum.getDate());
              return <button key={dateKey} type="button" disabled={disabled} aria-label={new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(date)} aria-pressed={dateKey === selectedDay} onClick={() => choose(dateKey)}>{dayNumber}</button>;
            })}
          </div>
          <div className="deadline-picker-time">
            <Clock3 size={16} aria-hidden="true"/>
            <span>Time</span>
            <select aria-label="Deadline hour" value={displayedHour} onChange={(event) => changeTime(Number(event.target.value), selectedSafe.getMinutes(), period)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => <option key={hour} value={hour}>{pad(hour)}</option>)}
            </select>
            <span aria-hidden="true">:</span>
            <select aria-label="Deadline minute" value={selectedSafe.getMinutes()} onChange={(event) => changeTime(displayedHour, Number(event.target.value), period)}>
              {options.map((minute) => <option key={minute} value={minute}>{pad(minute)}</option>)}
            </select>
            <select aria-label="Deadline AM or PM" value={period} onChange={(event) => changeTime(displayedHour, selectedSafe.getMinutes(), event.target.value)}><option>AM</option><option>PM</option></select>
          </div>
          <button type="button" className="deadline-picker-done" onClick={() => setExpanded(false)}>Done</button>
        </div>
      )}
      {invalid && <p className="deadline-picker-error" role="alert">Select a future deadline.</p>}
    </div>
  );
}
