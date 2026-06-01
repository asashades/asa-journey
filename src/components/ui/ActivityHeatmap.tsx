'use client';

import { format } from 'date-fns';

export type ActivityHeatmapDay = {
  date: Date;
  dateKey: string;
  count: number;
};

type ActivityHeatmapProps = {
  data: ActivityHeatmapDay[];
  color: string;
  title?: string;
  emptyColor?: string;
  onDayClick?: (day: ActivityHeatmapDay) => void;
  getDayTitle?: (day: ActivityHeatmapDay) => string;
};

export function ActivityHeatmap({
  data,
  color,
  title,
  emptyColor = '#EEF0EF',
  onDayClick,
  getDayTitle,
}: ActivityHeatmapProps) {
  const weekCount = Math.max(1, Math.ceil(data.length / 7));
  const columnWidth = 14;
  const monthMarkers = data.reduce<Array<{ key: string; label: string; column: number }>>((markers, day, index) => {
    if (index === 0 || day.date.getDate() === 1) {
      markers.push({
        key: day.dateKey,
        label: format(day.date, data.length > 370 && day.date.getMonth() === 0 ? 'MMM yy' : 'MMM'),
        column: Math.floor(index / 7),
      });
    }

    return markers;
  }, []);

  return (
    <section>
      {title && (
        <h3 className="mb-2 font-sans text-sm font-bold tracking-normal text-[#2F3331]">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-max">
          <div className="relative mb-2 h-4" style={{ width: weekCount * columnWidth }}>
            {monthMarkers.map(marker => (
              <span
                key={marker.key}
                className="absolute top-0 text-[10px] font-semibold uppercase text-[#A3A7A8]"
                style={{ left: marker.column * columnWidth }}
              >
                {marker.label}
              </span>
            ))}
          </div>
          <div
            className="grid grid-flow-col grid-rows-7 gap-1"
            style={{ gridTemplateColumns: `repeat(${weekCount}, 10px)` }}
          >
            {data.map(day => {
              const active = day.count > 0;
              const titleText = getDayTitle ? getDayTitle(day) : `${day.dateKey}: ${day.count}`;
              const style = { backgroundColor: active ? color : emptyColor };

              if (onDayClick) {
                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    disabled={!active}
                    onClick={() => active && onDayClick(day)}
                    className={`h-2.5 w-2.5 shrink-0 rounded-sm transition-colors ${active ? 'cursor-pointer' : 'cursor-default'}`}
                    style={style}
                    title={titleText}
                    aria-label={titleText}
                  />
                );
              }

              return (
                <span
                  key={day.dateKey}
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={style}
                  title={titleText}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
